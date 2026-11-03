import React, { useState, useEffect } from 'react';
import { 
  Award, ArrowLeft, ShieldCheck, CheckCircle2, User, 
  BookOpen, Sliders, Share2, Sparkles, Home, Download
} from 'lucide-react';
import { Course } from '../../../types';
import { DEFAULT_MASTERCLASS_COURSE } from '../../../components/lms/mockCourses';
import { CertificateGenerator } from '../../../components/lms/CertificateGenerator';
import { playTapBeep } from '../../../utils/audio';

interface CertificatePageProps {
  onBack?: () => void;
  initialCourse?: Course;
  defaultStudentName?: string;
}

export const CertificatePage: React.FC<CertificatePageProps> = ({
  onBack,
  initialCourse,
  defaultStudentName
}) => {
  // Parsing des paramètres d'URL (?cert=...&student=...&course=...)
  const searchParams = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : null;
  const urlCertId = searchParams?.get('cert') || undefined;
  const urlStudent = searchParams?.get('student') || undefined;
  const urlCourseTitle = searchParams?.get('course') || undefined;
  const urlDate = searchParams?.get('date') || undefined;
  const urlScore = searchParams?.get('score') ? parseInt(searchParams.get('score')!, 10) : 98;

  const [studentName, setStudentName] = useState<string>(
    urlStudent || defaultStudentName || 'Ibrahim Pousbila Konkobo'
  );
  const [course, setCourse] = useState<Course>(() => {
    if (initialCourse) return initialCourse;
    if (urlCourseTitle) {
      return {
        ...DEFAULT_MASTERCLASS_COURSE,
        title: urlCourseTitle
      };
    }
    return DEFAULT_MASTERCLASS_COURSE;
  });
  const [scorePercentage, setScorePercentage] = useState<number>(urlScore);

  const handleReturn = () => {
    playTapBeep();
    if (onBack) {
      onBack();
    } else if (typeof window !== 'undefined') {
      if (window.history.length > 1) {
        window.history.back();
      } else {
        window.location.href = '/';
      }
    }
  };

  return (
    <div className="min-h-screen bg-[#030712] text-slate-100 flex flex-col font-sans select-none pb-24">
      {/* 1. Header supérieur de la page officielle */}
      <header className="sticky top-0 z-40 bg-slate-950/90 backdrop-blur-xl border-b border-slate-800/80 px-4 sm:px-8 py-3.5 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={handleReturn}
            className="p-2 sm:px-3 sm:py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-700/80 transition-all flex items-center gap-1.5 cursor-pointer active:scale-95 text-xs font-bold"
            title="Retour"
          >
            <ArrowLeft className="w-4 h-4 text-amber-400" />
            <span className="hidden sm:inline">Retour au Campus / Hub</span>
          </button>

          <div className="h-6 w-px bg-slate-800 hidden sm:block" />

          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-2xl bg-gradient-to-tr from-amber-500 to-amber-600 text-slate-950 flex items-center justify-center font-black shadow-lg shadow-amber-500/25">
              <Award className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-sm sm:text-base font-black text-white tracking-wide">
                  Certificat Officiel &amp; Diplôme d'Aptitude
                </h1>
                <span className="hidden sm:inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  <ShieldCheck className="w-3 h-3 text-emerald-400" />
                  QR Code Vérifié
                </span>
              </div>
              <p className="text-[11px] text-slate-400">
                NaNa Academy • ENTREPRISE KONKOBO POUSBILA
              </p>
            </div>
          </div>
        </div>

        {/* Bouton Accueil rapide */}
        <button
          type="button"
          onClick={() => {
            playTapBeep();
            if (typeof window !== 'undefined') {
              window.history.pushState({}, '', '/');
              window.dispatchEvent(new PopStateEvent('popstate'));
            }
          }}
          className="p-2 sm:px-3 sm:py-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-300 text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
          title="Accueil"
        >
          <Home className="w-4 h-4 text-indigo-400" />
          <span className="hidden sm:inline">Accueil Principal</span>
        </button>
      </header>

      {/* 2. Barre d'outils et de personnalisation dynamique */}
      <div className="bg-slate-950/60 border-b border-slate-800/80 px-4 sm:px-8 py-3">
        <div className="max-w-6xl mx-auto flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-bold text-slate-400 flex items-center gap-1.5">
              <Sliders className="w-3.5 h-3.5 text-amber-400" />
              Titulaire du diplôme :
            </span>

            {/* Sélecteurs de noms rapides pour tests */}
            <div className="flex items-center gap-1.5 flex-wrap">
              {['Ibrahim Pousbila Konkobo', 'Kadiatou Diallo', 'Marc Ouedraogo'].map((name) => (
                <button
                  key={name}
                  type="button"
                  onClick={() => {
                    playTapBeep();
                    setStudentName(name);
                  }}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition cursor-pointer ${
                    studentName === name
                      ? 'bg-amber-500 text-slate-950 shadow-md'
                      : 'bg-slate-900 text-slate-300 hover:text-white border border-slate-800'
                  }`}
                >
                  {name.split(' ')[0]} {name.split(' ')[1]?.[0]}.
                </button>
              ))}

              {/* Champ de saisie libre */}
              <div className="flex items-center gap-1 bg-slate-900 border border-slate-800 rounded-lg px-2 py-0.5">
                <User className="w-3 h-3 text-slate-500" />
                <input
                  type="text"
                  value={studentName}
                  onChange={(e) => setStudentName(e.target.value)}
                  placeholder="Nom personnalisé..."
                  className="bg-transparent text-xs text-white placeholder:text-slate-500 focus:outline-none w-36 sm:w-48 py-0.5"
                />
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 text-[11px] text-slate-400">
            <span className="flex items-center gap-1 text-emerald-400 font-bold">
              <CheckCircle2 className="w-3.5 h-3.5" />
              Cryptographie &amp; QR Code Déterministe
            </span>
          </div>
        </div>
      </div>

      {/* 3. Zone principale de rendu du Certificat */}
      <main className="flex-1 max-w-6xl w-full mx-auto p-4 sm:p-8 flex flex-col items-center justify-center">
        <CertificateGenerator
          course={course}
          studentName={studentName}
          completionDate={urlDate}
          certificateId={urlCertId}
          scorePercentage={scorePercentage}
          className="w-full"
        />
      </main>
    </div>
  );
};

export default CertificatePage;
