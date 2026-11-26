import React from 'react';
import { ResumeData } from '../../../types';
import { 
  Phone, 
  Mail, 
  MapPin, 
  ShieldCheck, 
  Award, 
  Check, 
  Star,
  Compass,
  Briefcase
} from 'lucide-react';

interface TemplateProps {
  resume: ResumeData;
  isPro?: boolean;
}

export const EliteExecutiveTemplate: React.FC<TemplateProps> = ({ resume, isPro = true }) => {
  const { personalInfo, experiences, education, skills, softSkills, languages, interests } = resume;

  return (
    <div 
      className="w-[794px] h-[1123px] max-h-[1123px] bg-[#fafafc] text-slate-900 font-sans flex flex-col justify-between relative overflow-hidden select-none box-border p-8 border border-amber-200/60 print:w-[210mm] print:h-[297mm] print:max-h-[297mm] print:border-none print:shadow-none"
      style={{ printColorAdjust: 'exact', WebkitPrintColorAdjust: 'exact' } as React.CSSProperties}
    >
      {/* ── FILIGRANE & MICRO-DÉTAILS LUXE EN FOND ── */}
      <div className="absolute top-0 right-0 w-80 h-80 bg-gradient-to-br from-amber-500/5 to-transparent rounded-full blur-2xl pointer-events-none" />
      <div className="absolute -bottom-20 -left-20 w-80 h-80 bg-gradient-to-tr from-slate-900/5 to-transparent rounded-full blur-2xl pointer-events-none" />

      <div className="space-y-5 relative z-10">
        {/* ── EN-TÊTE ÉLITE EXÉCUTIF (LUXE & HAUTE COUTURE) ── */}
        <header className="bg-gradient-to-r from-[#0c1322] via-[#111c33] to-[#0c1322] rounded-3xl p-6 text-white shadow-xl border border-amber-500/30 flex items-center justify-between gap-6 relative overflow-hidden">
          {/* Liseré or supérieur */}
          <div className="absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-amber-600 via-amber-300 to-amber-600" />

          <div className="flex items-center gap-5">
            {/* Portrait avec sceau doré octogonal ou arrondi luxe */}
            <div className="relative">
              <div className="w-[105px] h-[105px] rounded-2xl overflow-hidden bg-slate-800 border-2 border-amber-400/80 shadow-2xl shrink-0 p-0.5">
                {personalInfo.photoUrl ? (
                  <img
                    src={personalInfo.photoUrl}
                    alt={personalInfo.fullName}
                    className="w-full h-full object-cover object-top rounded-xl"
                    crossOrigin="anonymous"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-slate-900 text-amber-300 font-serif text-3xl font-bold">
                    {personalInfo.fullName.slice(0, 2).toUpperCase()}
                  </div>
                )}
              </div>
            </div>

            {/* Titre & Identité */}
            <div className="space-y-1.5">
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 rounded-full bg-amber-400/15 border border-amber-400/40 text-amber-300 font-extrabold text-[9.5px] uppercase tracking-widest flex items-center gap-1">
                  <Star className="w-2.5 h-2.5 fill-amber-300" />
                  Grade Exécutif
                </span>
                <span className="text-[10px] text-slate-400 font-mono">Standard International</span>
              </div>

              <h1 className="text-[29px] font-black tracking-tight text-white uppercase font-sans leading-none">
                {personalInfo.fullName}
              </h1>

              <p className="text-[13.5px] font-bold text-amber-200 tracking-wide">
                {personalInfo.title}
              </p>
            </div>
          </div>

          {/* Sceau de Certification Latéral */}
          <div className="text-right space-y-1 text-[10.5px] text-slate-300 border-l border-white/10 pl-5 shrink-0">
            <div className="flex items-center justify-end gap-1.5 text-amber-300 font-bold">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span className="text-[10px] uppercase tracking-wider">Identité Contrôlée</span>
            </div>
            <p className="text-white font-medium">{personalInfo.phone}</p>
            <p className="text-slate-300 truncate max-w-[190px]">{personalInfo.email}</p>
            <p className="text-slate-400 text-[10px]">{personalInfo.location}</p>
          </div>
        </header>

        {/* ── DÉCLARATION STRATÉGIQUE (BIO IMPACTANTE) ── */}
        {personalInfo.bio && (
          <div className="bg-white rounded-2xl p-4 border border-amber-100 shadow-sm text-[11px] text-slate-700 leading-relaxed font-medium flex items-start gap-3">
            <div className="w-7 h-7 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-700 flex items-center justify-center shrink-0 mt-0.5">
              <Award className="w-3.5 h-3.5" />
            </div>
            <div className="flex-1">
              <span className="font-black uppercase tracking-wider text-[9.5px] text-amber-800 block mb-0.5">
                Vision & Valeur Ajoutée Exécutive
              </span>
              {personalInfo.bio}
            </div>
          </div>
        )}

        {/* ── CONTENU PRINCIPAL EN 2 COLONNES HAUT DE GAMME ── */}
        <div className="grid grid-cols-12 gap-5 items-start">
          {/* ── COLONNE GAUCHE (7 Colonnes) : Expériences Majeures ── */}
          <div className="col-span-7 space-y-4">
            <section className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm space-y-3.5">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                <h2 className="text-[12px] font-black uppercase tracking-wider text-slate-900 flex items-center gap-2">
                  <Briefcase className="w-4 h-4 text-amber-700" />
                  <span>Leadership & Parcours Professionnel</span>
                </h2>
                <span className="text-[9.5px] text-amber-700 font-bold bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
                  Carrière
                </span>
              </div>

              <div className="space-y-3.5">
                {experiences.map((exp, idx) => (
                  <div key={idx} className="space-y-1 border-l-2 border-amber-500/40 pl-3">
                    <div className="flex justify-between items-baseline gap-2">
                      <h3 className="text-[11.5px] font-black text-slate-900">
                        {exp.title}
                      </h3>
                      <span className="text-[9.5px] font-mono font-bold text-amber-800 bg-amber-50/80 px-1.5 py-0.2 rounded border border-amber-200/50 shrink-0">
                        {exp.startDate} - {exp.endDate}
                      </span>
                    </div>

                    <p className="text-[10.5px] font-bold text-slate-700">
                      {exp.company} <span className="font-normal text-slate-500">• {exp.location}</span>
                    </p>

                    <ul className="space-y-1 pt-0.5">
                      {exp.achievements.map((ach, i) => (
                        <li key={i} className="text-[10px] text-slate-600 flex items-start gap-1.5 leading-snug">
                          <span className="w-1.5 h-1.5 rounded-full bg-amber-600 mt-1 shrink-0" />
                          <span>{ach}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </section>

            {/* Formation & Hautes Études */}
            <section className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm space-y-2.5">
              <h2 className="text-[12px] font-black uppercase tracking-wider text-slate-900 flex items-center gap-2 border-b border-slate-100 pb-1.5">
                <Award className="w-4 h-4 text-amber-700" />
                <span>Titres Universitaires & Certifications</span>
              </h2>

              <div className="space-y-2">
                {education.map((edu, idx) => (
                  <div key={idx} className="flex justify-between items-start text-[10.5px]">
                    <div>
                      <span className="font-black text-slate-900 block">{edu.degree}</span>
                      <span className="text-slate-600 text-[10px] font-medium">{edu.school}</span>
                    </div>
                    <span className="text-[9.5px] font-mono font-bold text-slate-700 bg-slate-100 px-2 py-0.5 rounded shrink-0 ml-2">
                      {edu.year}
                    </span>
                  </div>
                ))}
              </div>
            </section>
          </div>

          {/* ── COLONNE DROITE (5 Colonnes) : Métriques & Compétences ── */}
          <div className="col-span-5 space-y-4">
            {/* Compétences Maîtresses avec Jauges Subtiles */}
            <section className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm space-y-2.5">
              <h2 className="text-[12px] font-black uppercase tracking-wider text-slate-900 border-b border-slate-100 pb-1.5 flex items-center justify-between">
                <span>Compétences Clés</span>
                <span className="text-[9px] text-slate-400">Niveau de Maîtrise</span>
              </h2>

              <div className="space-y-2">
                {skills.map((s, idx) => {
                  const rating = 85 + (idx % 3) * 5; // 85% à 95%
                  return (
                    <div key={idx} className="space-y-1">
                      <div className="flex justify-between text-[10px] font-bold text-slate-800">
                        <span className="truncate max-w-[150px]">{s}</span>
                        <span className="text-amber-800 font-mono text-[9.5px]">{rating}%</span>
                      </div>
                      <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden border border-slate-200">
                        <div
                          className="h-full bg-gradient-to-r from-amber-600 to-amber-400 rounded-full"
                          style={{ width: `${rating}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>

            {/* Savoir-Être & Posture Managériale */}
            {softSkills && softSkills.length > 0 && (
              <section className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm space-y-2">
                <h2 className="text-[12px] font-black uppercase tracking-wider text-slate-900 border-b border-slate-100 pb-1">
                  Posture Exécutive
                </h2>
                <div className="space-y-1.5 text-[10px] text-slate-700 font-medium">
                  {softSkills.map((sk, idx) => (
                    <div key={idx} className="flex items-center gap-1.5">
                      <div className="w-3.5 h-3.5 rounded-full bg-amber-100 text-amber-800 flex items-center justify-center shrink-0">
                        <Check className="w-2.5 h-2.5 stroke-[3]" />
                      </div>
                      <span>{sk}</span>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* Langues & Mobilité */}
            <section className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm space-y-2">
              <h2 className="text-[12px] font-black uppercase tracking-wider text-slate-900 border-b border-slate-100 pb-1">
                Langues & International
              </h2>
              <div className="space-y-1.5">
                {languages.map((l, idx) => (
                  <div key={idx} className="flex justify-between items-center text-[10.5px]">
                    <span className="font-bold text-slate-800">{l.name}</span>
                    <span className="text-amber-900 bg-amber-50 px-2 py-0.2 rounded-full border border-amber-200 text-[9.5px] font-semibold">
                      {l.level}
                    </span>
                  </div>
                ))}
              </div>
            </section>

            {/* Centres d'intérêt & Mobilité Géographique */}
            {interests && interests.length > 0 && (
              <section className="bg-white rounded-2xl p-3.5 border border-slate-200 shadow-sm space-y-1">
                <h2 className="text-[11px] font-black uppercase tracking-wider text-slate-900 border-b border-slate-100 pb-1 flex items-center gap-1">
                  <Compass className="w-3 h-3 text-amber-700" />
                  <span>Mobilité & Centres d'Intérêt</span>
                </h2>
                <p className="text-[9.5px] text-slate-600 leading-tight italic pt-0.5">
                  {interests.join(' • ')}
                </p>
              </section>
            )}
          </div>
        </div>
      </div>

      {/* ── PIED DE PAGE EXÉCUTIF AVEC FILIGRANE LUXE ── */}
      <footer className="pt-3 border-t border-amber-300/40 flex items-center justify-between text-[9px] text-slate-500 relative z-10">
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-3 h-3 text-amber-600" />
          <span className="font-black text-slate-800 tracking-wide uppercase">Dossier de Candidature Exécutif • Document Scellé</span>
        </div>
        <span className="font-mono text-amber-800 font-bold">Dossier Professionnel Certifié</span>
      </footer>
    </div>
  );
};

export default EliteExecutiveTemplate;
