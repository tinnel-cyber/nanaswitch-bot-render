import React from 'react';
import { ResumeData } from '../../../types';
import { Phone, Mail, MapPin, Globe, Briefcase, GraduationCap, Award, ShieldCheck, CheckCircle2 } from 'lucide-react';

interface TemplateProps {
  resume: ResumeData;
  isPro?: boolean;
}

export const ProCorporateTemplate: React.FC<TemplateProps> = ({ resume, isPro = true }) => {
  const { personalInfo, experiences, education, skills, softSkills, languages, interests } = resume;

  return (
    <div 
      className="w-[794px] h-[1123px] max-h-[1123px] bg-white text-slate-900 font-sans flex flex-col justify-between relative overflow-hidden select-none box-border p-8 border border-slate-200 print:w-[210mm] print:h-[297mm] print:max-h-[297mm] print:border-none print:shadow-none"
      style={{ printColorAdjust: 'exact', WebkitPrintColorAdjust: 'exact' } as React.CSSProperties}
    >
      <div className="space-y-6">
        {/* ── EN-TÊTE CORPORATE SILICON VALLEY ── */}
        <header className="border-b-2 border-slate-900 pb-5 flex items-center justify-between gap-6">
          <div className="flex items-center gap-5">
            {/* Photo avec double cadre subtil */}
            <div className="w-[100px] h-[100px] rounded-2xl overflow-hidden bg-slate-100 border-2 border-slate-900 shadow-md shrink-0">
              {personalInfo.photoUrl ? (
                <img
                  src={personalInfo.photoUrl}
                  alt={personalInfo.fullName}
                  className="w-full h-full object-cover object-top"
                  crossOrigin="anonymous"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-slate-900 text-white font-black text-2xl">
                  {personalInfo.fullName.slice(0, 2).toUpperCase()}
                </div>
              )}
            </div>

            {/* Identité & Titre */}
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 rounded-full bg-blue-50 border border-blue-200 text-blue-800 text-[10px] font-black uppercase tracking-wider">
                  Profil Exécutif Certifié
                </span>
                <span className="text-[10px] font-mono text-slate-400">ID: PRO-{new Date().getFullYear()}</span>
              </div>
              <h1 className="text-[28px] font-black tracking-tight text-slate-950 uppercase leading-none font-sans">
                {personalInfo.fullName}
              </h1>
              <p className="text-[14px] font-bold text-blue-800 tracking-wide font-sans">
                {personalInfo.title}
              </p>
            </div>
          </div>

          {/* Bandeau de contact compact */}
          <div className="text-right space-y-1.5 text-[11px] text-slate-600 border-l border-slate-200 pl-5 shrink-0">
            <p className="flex items-center justify-end gap-1.5 font-bold text-slate-900">
              <span>{personalInfo.phone}</span>
              <Phone className="w-3 h-3 text-blue-700" />
            </p>
            <p className="flex items-center justify-end gap-1.5 text-slate-700">
              <span className="truncate max-w-[180px]">{personalInfo.email}</span>
              <Mail className="w-3 h-3 text-blue-700" />
            </p>
            <p className="flex items-center justify-end gap-1.5 text-slate-600">
              <span className="truncate max-w-[200px]">{personalInfo.location}</span>
              <MapPin className="w-3 h-3 text-blue-700" />
            </p>
          </div>
        </header>

        {/* ── RÉSUMÉ EXÉCUTIF ── */}
        {personalInfo.bio && (
          <section className="bg-slate-50 border border-slate-200/80 rounded-xl p-3.5 text-[11.5px] text-slate-700 leading-relaxed font-medium">
            <span className="font-black text-slate-900 uppercase tracking-wider text-[10px] block mb-1 text-blue-900">
              Synthèse & Objectif Professionnel
            </span>
            {personalInfo.bio}
          </section>
        )}

        {/* ── GRILLE PRINCIPALE EN 2 COLONNES ASYMÉTRIQUES (7 / 5) ── */}
        <div className="grid grid-cols-12 gap-6 items-start">
          {/* ── COLONNE GAUCHE (7 Cols) : Parcours & Réalisations ── */}
          <div className="col-span-7 space-y-5">
            {/* Expériences avec Timeline */}
            <section className="space-y-3">
              <h2 className="text-[13px] font-black uppercase tracking-wider text-slate-950 flex items-center gap-2 border-b border-slate-200 pb-1.5">
                <Briefcase className="w-4 h-4 text-blue-800" />
                <span>Expériences & Postes Occupés</span>
              </h2>

              <div className="relative pl-4 space-y-4 before:absolute before:left-1 before:top-2 before:bottom-2 before:w-[1.5px] before:bg-slate-300">
                {experiences.map((exp, idx) => (
                  <div key={idx} className="relative space-y-1">
                    {/* Nœud de timeline */}
                    <span className="absolute -left-[19px] top-1.5 w-2.5 h-2.5 rounded-full bg-blue-800 border-2 border-white ring-1 ring-blue-800/30" />

                    <div className="flex justify-between items-baseline gap-2">
                      <h3 className="text-[12px] font-black text-slate-900 leading-tight">
                        {exp.title}
                      </h3>
                      <span className="text-[10px] font-mono font-bold text-blue-800 px-1.5 py-0.2 bg-blue-50 rounded border border-blue-200/60 shrink-0">
                        {exp.startDate} - {exp.endDate}
                      </span>
                    </div>

                    <p className="text-[11px] font-bold text-slate-700">
                      {exp.company} <span className="font-normal text-slate-500">• {exp.location}</span>
                    </p>

                    <ul className="space-y-1 pt-0.5">
                      {exp.achievements.map((ach, i) => (
                        <li key={i} className="text-[10px] text-slate-600 flex items-start gap-1.5 leading-snug">
                          <span className="w-1 h-1 rounded-full bg-blue-700 mt-1.5 shrink-0" />
                          <span>{ach}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </section>

            {/* Formation & Certificats */}
            <section className="space-y-2.5">
              <h2 className="text-[13px] font-black uppercase tracking-wider text-slate-950 flex items-center gap-2 border-b border-slate-200 pb-1.5">
                <GraduationCap className="w-4 h-4 text-blue-800" />
                <span>Cursus Académique & Diplômes</span>
              </h2>

              <div className="space-y-2">
                {education.map((edu, idx) => (
                  <div key={idx} className="flex justify-between items-start text-[11px] bg-slate-50/60 p-2 rounded-lg border border-slate-200/60">
                    <div>
                      <span className="font-black text-slate-900 block text-[11.5px]">{edu.degree}</span>
                      <span className="text-slate-600 text-[10.5px] font-medium">{edu.school}</span>
                      {edu.description && (
                        <p className="text-[9.5px] text-slate-500 italic mt-0.5">{edu.description}</p>
                      )}
                    </div>
                    <span className="text-[10px] font-mono font-black text-slate-700 bg-white px-1.5 py-0.5 rounded border border-slate-200 shrink-0 ml-2">
                      {edu.year}
                    </span>
                  </div>
                ))}
              </div>
            </section>
          </div>

          {/* ── COLONNE DROITE (5 Cols) : Hard/Soft Skills, Langues, Mobilité ── */}
          <div className="col-span-5 space-y-4 border-l border-slate-200 pl-5">
            {/* Compétences Opérationnelles */}
            <section className="space-y-2">
              <h2 className="text-[12px] font-black uppercase tracking-wider text-slate-950 flex items-center gap-1.5 border-b border-slate-200 pb-1">
                <Award className="w-3.5 h-3.5 text-blue-800" />
                <span>Expertise Métier</span>
              </h2>
              <div className="flex flex-wrap gap-1.5">
                {skills.map((s, idx) => (
                  <span
                    key={idx}
                    className="px-2 py-1 rounded-md bg-slate-900 text-white font-bold text-[9.5px] shadow-sm tracking-wide"
                  >
                    {s}
                  </span>
                ))}
              </div>
            </section>

            {/* Savoir-Être (Soft Skills) */}
            {softSkills && softSkills.length > 0 && (
              <section className="space-y-1.5">
                <h2 className="text-[12px] font-black uppercase tracking-wider text-slate-950 border-b border-slate-200 pb-1">
                  Atouts Managériaux
                </h2>
                <div className="space-y-1 text-[10.5px] text-slate-700 font-medium">
                  {softSkills.map((sk, idx) => (
                    <div key={idx} className="flex items-center gap-1.5">
                      <CheckCircle2 className="w-3 h-3 text-emerald-600 shrink-0" />
                      <span>{sk}</span>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* Langues avec Barres de progression Pro */}
            <section className="space-y-2">
              <h2 className="text-[12px] font-black uppercase tracking-wider text-slate-950 border-b border-slate-200 pb-1">
                Maîtrise Linguistique
              </h2>
              <div className="space-y-2">
                {languages.map((l, idx) => {
                  const pct = l.percent || (idx === 0 ? 100 : idx === 1 ? 85 : 70);
                  return (
                    <div key={idx} className="space-y-0.5">
                      <div className="flex justify-between text-[10.5px] font-bold text-slate-800">
                        <span>{l.name}</span>
                        <span className="text-slate-500 font-normal text-[9.5px]">{l.level}</span>
                      </div>
                      <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden border border-slate-200">
                        <div
                          className="h-full bg-blue-800 rounded-full"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>

            {/* Centres d'intérêt & Mobilité */}
            {interests && interests.length > 0 && (
              <section className="space-y-1.5">
                <h2 className="text-[12px] font-black uppercase tracking-wider text-slate-950 border-b border-slate-200 pb-1">
                  Mobilité & Intérêts
                </h2>
                <ul className="space-y-1 text-[10px] text-slate-600 italic">
                  {interests.map((it, idx) => (
                    <li key={idx} className="flex items-start gap-1">
                      <span className="text-blue-800 font-black">•</span>
                      <span>{it}</span>
                    </li>
                  ))}
                </ul>
              </section>
            )}
          </div>
        </div>
      </div>

      {/* ── PIED DE PAGE HAUTE QUALITÉ ── */}
      <footer className="pt-3 border-t border-slate-200 flex items-center justify-between text-[9px] text-slate-500">
        <div className="flex items-center gap-1.5">
          <ShieldCheck className="w-3.5 h-3.5 text-blue-700" />
          <span className="font-semibold text-slate-700">Document Officiel Normalisé A4 • Qualité Haute Définition</span>
        </div>
        <span className="font-mono">Généré via Nanasore Pro Suite</span>
      </footer>
    </div>
  );
};

export default ProCorporateTemplate;
