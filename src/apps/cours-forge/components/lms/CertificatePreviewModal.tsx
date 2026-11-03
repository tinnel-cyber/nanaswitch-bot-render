import React, { useState } from 'react';
import { 
  Award, X, Eye, Sparkles, BookOpen, CheckCircle2, 
  RotateCcw, Sliders, ShieldCheck 
} from 'lucide-react';
import { Course } from '../../../../types';
import { DEFAULT_MASTERCLASS_COURSE } from './mockCourses';
import { CertificateGenerator } from './CertificateGenerator';
import { playTapBeep } from '../../../../utils/audio';

export interface CertificatePreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialCourse?: Course;
  defaultStudentName?: string;
}

export const CertificatePreviewModal: React.FC<CertificatePreviewModalProps> = ({
  isOpen,
  onClose,
  initialCourse,
  defaultStudentName = 'Ibrahim Pousbila Konkobo'
}) => {
  const [course, setCourse] = useState<Course>(initialCourse || DEFAULT_MASTERCLASS_COURSE);
  const [studentName, setStudentName] = useState(defaultStudentName);
  const [scorePercentage, setScorePercentage] = useState(98);

  React.useEffect(() => {
    if (initialCourse) {
      setCourse(initialCourse);
    }
  }, [initialCourse]);

  React.useEffect(() => {
    if (defaultStudentName) {
      setStudentName(defaultStudentName);
    }
  }, [defaultStudentName]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex flex-col items-center justify-start overflow-y-auto p-3 sm:p-6 animate-fade-in font-sans select-none">
      <div className="w-full max-w-5xl bg-slate-900 border border-amber-500/40 rounded-3xl shadow-2xl overflow-hidden my-auto flex flex-col">
        {/* En-tête de la Modale */}
        <div className="px-5 py-4 bg-slate-950/90 border-b border-slate-800 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-amber-500 to-amber-600 text-slate-950 flex items-center justify-center font-black shadow-lg shadow-amber-500/20">
              <Award className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm sm:text-base font-black text-white">
                  Aperçu &amp; Test du Certificat Officiel
                </h3>
                <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  QR Code Vérifié
                </span>
              </div>
              <p className="text-[11px] text-slate-400">
                NaNa Academy • ENTREPRISE KONKOBO POUSBILA
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => {
              playTapBeep();
              onClose();
            }}
            className="p-2 rounded-xl bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700 transition cursor-pointer"
            title="Fermer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Barre de Configuration Rapide du Test */}
        <div className="p-3 sm:p-4 bg-slate-950/60 border-b border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-3 flex-wrap">
            <span className="font-bold text-slate-400 flex items-center gap-1.5">
              <Sliders className="w-3.5 h-3.5 text-amber-400" />
              Données de test :
            </span>

            {/* Sélecteur de nom rapide */}
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => setStudentName('Ibrahim Pousbila Konkobo')}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition cursor-pointer ${
                  studentName === 'Ibrahim Pousbila Konkobo'
                    ? 'bg-amber-500 text-slate-950'
                    : 'bg-slate-800 text-slate-300 hover:text-white'
                }`}
              >
                Ibrahim P. Konkobo
              </button>
              <button
                type="button"
                onClick={() => setStudentName('Fatou Traoré')}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition cursor-pointer ${
                  studentName === 'Fatou Traoré'
                    ? 'bg-amber-500 text-slate-950'
                    : 'bg-slate-800 text-slate-300 hover:text-white'
                }`}
              >
                Fatou Traoré
              </button>
              <button
                type="button"
                onClick={() => setStudentName('Oumar Sawadogo')}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition cursor-pointer ${
                  studentName === 'Oumar Sawadogo'
                    ? 'bg-amber-500 text-slate-950'
                    : 'bg-slate-800 text-slate-300 hover:text-white'
                }`}
              >
                Oumar Sawadogo
              </button>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-slate-400">Score de test :</span>
            <select
              value={scorePercentage}
              onChange={(e) => setScorePercentage(Number(e.target.value))}
              className="bg-slate-800 text-slate-200 border border-slate-700 rounded-lg px-2 py-1 text-xs focus:outline-none"
            >
              <option value={98}>98% (Excellence)</option>
              <option value={95}>95% (Très Honorable)</option>
              <option value={90}>90% (Très Bien)</option>
              <option value={85}>85% (Bien)</option>
            </select>
          </div>
        </div>

        {/* Corps de la Modale : Le Générateur avec aperçu interactif */}
        <div className="p-4 sm:p-6 overflow-y-auto max-h-[calc(85vh-140px)]">
          <CertificateGenerator
            course={course}
            studentName={studentName}
            scorePercentage={scorePercentage}
          />
        </div>
      </div>
    </div>
  );
};

export default CertificatePreviewModal;
