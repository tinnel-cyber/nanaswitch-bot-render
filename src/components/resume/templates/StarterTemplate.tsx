import React from 'react';
import { ResumeData } from '../../../types';
import { Phone, Mail, MapPin, User } from 'lucide-react';

interface TemplateProps {
  resume: ResumeData;
  isPro?: boolean;
}

export const StarterTemplate: React.FC<TemplateProps> = ({ resume, isPro = false }) => {
  const { personalInfo, experiences, education, skills, softSkills, languages, interests, competencesDetaillees } = resume;

  return (
    <div 
      className="w-[794px] h-[1123px] max-h-[1123px] bg-white text-slate-900 font-sans flex flex-col relative overflow-hidden select-none box-border print:w-[210mm] print:h-[297mm] print:max-h-[297mm] print:border-none print:shadow-none"
      style={{ printColorAdjust: 'exact', WebkitPrintColorAdjust: 'exact' } as React.CSSProperties}
    >
      {/* ── BANDEAU SUPÉRIEUR (Header & Photo) ── */}
      <header className="w-full flex items-stretch h-[142px] shrink-0 border-b border-[#0e2b4b]/20">
        {/* Zone Photo (Gauche ~34% - 270px) */}
        <div className="w-[270px] shrink-0 bg-[#eef3f8] flex items-center justify-center p-3 border-r border-[#0e2b4b]/20">
          <div className="w-[110px] h-[126px] rounded-sm overflow-hidden bg-slate-200 border-2 border-[#0e2b4b] shadow-md flex items-center justify-center">
            {personalInfo.photoUrl ? (
              <img
                src={personalInfo.photoUrl}
                alt={personalInfo.fullName}
                className="w-full h-full object-cover object-top"
                crossOrigin="anonymous"
              />
            ) : (
              <User className="w-12 h-12 text-slate-400" />
            )}
          </div>
        </div>

        {/* Bloc Titre Bleu Nuit (Droite ~66% - 524px) */}
        <div className="flex-1 bg-[#0e2b4b] text-white flex flex-col justify-center px-8 py-4">
          <h1 className="text-[25px] font-black uppercase tracking-wider text-white leading-tight font-sans">
            {personalInfo.fullName}
          </h1>
          <p className="text-[14.5px] italic text-slate-200 font-serif mt-1 tracking-wide leading-snug">
            {personalInfo.title}
          </p>
        </div>
      </header>

      {/* ── CORPS DU CV : 2 COLONNES NORMALISÉES ── */}
      <div className="flex-1 flex w-full overflow-hidden">
        {/* ── COLONNE GAUCHE (Gris-Bleu Doux ~34% - 270px) ── */}
        <aside className="w-[270px] shrink-0 bg-[#eef3f8] border-r border-[#0e2b4b]/20 p-5 flex flex-col justify-between text-[11px] leading-snug space-y-4">
          <div className="space-y-4">
            {/* 1. Coordonnées */}
            <section className="space-y-2">
              <h2 className="text-[14px] font-black text-[#0e2b4b] tracking-wide">
                Coordonnées
              </h2>
              <div className="space-y-2 text-[#0e2b4b] font-medium">
                <div className="flex items-center gap-2.5">
                  <div className="w-5 h-5 rounded-full bg-[#0e2b4b] text-white flex items-center justify-center shrink-0">
                    <Phone className="w-2.5 h-2.5 fill-white" />
                  </div>
                  <span className="font-semibold">{personalInfo.phone}</span>
                </div>

                <div className="flex items-center gap-2.5">
                  <div className="w-5 h-5 rounded-full bg-[#0e2b4b] text-white flex items-center justify-center shrink-0">
                    <Mail className="w-2.5 h-2.5" />
                  </div>
                  <span className="truncate">{personalInfo.email}</span>
                </div>

                <div className="flex items-start gap-2.5">
                  <div className="w-5 h-5 rounded-full bg-[#0e2b4b] text-white flex items-center justify-center shrink-0 mt-0.5">
                    <MapPin className="w-2.5 h-2.5" />
                  </div>
                  <span className="text-[10px] leading-tight font-medium">
                    {personalInfo.location}
                  </span>
                </div>
              </div>
            </section>

            {/* 2. Langues (Jauges en Pilules Horizontales épaisses) */}
            <section className="space-y-2">
              <h2 className="text-[14px] font-black text-[#0e2b4b] tracking-wide">
                Langues
              </h2>
              <div className="space-y-2">
                {languages.map((lang, idx) => {
                  const pct = lang.percent || (idx === 0 ? 95 : idx === 1 ? 85 : idx === 2 ? 70 : 50);
                  const barWidth = Math.round((pct / 100) * 85); // Largeur max ~85px

                  return (
                    <div key={idx} className="flex items-center justify-between text-[#0e2b4b]">
                      <span className="text-[11.5px] font-semibold">{lang.name}</span>
                      <div className="w-[85px] flex justify-start">
                        <div
                          className="h-[7px] bg-[#0e2b4b] rounded-full"
                          style={{ width: `${barWidth}px` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>

            {/* 3. Compétences */}
            <section className="space-y-2">
              <h2 className="text-[14px] font-black text-[#0e2b4b] tracking-wide">
                Compétences
              </h2>

              {/* Mots-clés comportementaux */}
              <div className="text-[10px] text-[#2c3e50] space-y-0.5 leading-tight pb-1">
                {softSkills && softSkills.length > 0 ? (
                  softSkills.map((sk, i) => (
                    <p key={i} className="font-medium">{sk}</p>
                  ))
                ) : (
                  <>
                    <p>Gestion du temps</p>
                    <p>Capacités d'organisation</p>
                    <p>Communication, conseil, gestion du groupe, relation</p>
                  </>
                )}
              </div>

              {/* Puces de compétences détaillées */}
              <ul className="space-y-1.5 text-[9.5px] text-[#1a2f4c] leading-tight">
                {competencesDetaillees && competencesDetaillees.length > 0 ? (
                  competencesDetaillees.map((comp, idx) => (
                    <li key={idx} className="flex items-start gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#1b4477] mt-1 shrink-0" />
                      <span>{comp}</span>
                    </li>
                  ))
                ) : (
                  skills.map((sk, idx) => (
                    <li key={idx} className="flex items-start gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#1b4477] mt-1 shrink-0" />
                      <span>{sk}</span>
                    </li>
                  ))
                )}
              </ul>
            </section>

            {/* 4. Centres d'intérêt ET Mobilité */}
            <section className="space-y-1.5">
              <h2 className="text-[13.5px] font-black text-[#0e2b4b] tracking-wide">
                Centres d'intérêt ET Mobilité
              </h2>
              <div className="text-[10px] italic text-[#2c3e50] space-y-0.5 font-serif">
                {interests && interests.length > 0 ? (
                  interests.map((item, idx) => (
                    <p key={idx}>{item}</p>
                  ))
                ) : (
                  <>
                    <p>Lecture</p>
                    <p>Randonnée</p>
                    <p>football</p>
                    <p>conseil, famille</p>
                    <p>connaissance de plusieurs zone du pays</p>
                  </>
                )}
              </div>
            </section>
          </div>

          {/* Signature bas de colonne */}
          <div className="pt-2 text-[8.5px] text-[#0e2b4b]/60 border-t border-[#0e2b4b]/15 text-center">
            CV Certifié • Modèle Starter NaNa
          </div>
        </aside>

        {/* ── COLONNE DROITE (Fond Blanc Pur ~66% - 524px) ── */}
        <main className="flex-1 bg-white p-6 sm:p-7 flex flex-col justify-between overflow-hidden">
          <div className="space-y-5">
            {/* Section 1 : Formation */}
            <section className="space-y-2.5">
              <h2 className="text-[16px] font-black text-[#0e2b4b] tracking-wide border-b-2 border-[#0e2b4b]/20 pb-1">
                Formation
              </h2>
              <ul className="space-y-2 text-[11px] text-[#1a2f4c]">
                {education.map((edu, idx) => (
                  <li key={idx} className="flex items-start gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#0e2b4b] mt-1.5 shrink-0" />
                    <div>
                      <span className="font-extrabold text-[#0e2b4b]">{edu.year} : </span>
                      <span className="font-bold text-[#1e3a5f]">{edu.degree}</span>
                      {edu.school && (
                        <span className="text-[#334155] font-medium"> | {edu.school}</span>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            </section>

            {/* Section 2 : Expérience Professionnelle */}
            <section className="space-y-3">
              <h2 className="text-[16px] font-black text-[#0e2b4b] tracking-wide border-b-2 border-[#0e2b4b]/20 pb-1">
                Expérience Professionnelle
              </h2>
              <div className="space-y-3.5">
                {experiences.map((exp, idx) => (
                  <div key={idx} className="space-y-1">
                    {/* Intitulé et lieu */}
                    <div className="text-[11.5px] font-black text-[#0e2b4b] leading-tight">
                      <span>{exp.title}</span>
                      {exp.company && (
                        <span className="text-[#1a4478] font-bold"> | {exp.company}</span>
                      )}
                      {exp.location && (
                        <span className="text-[#3b597c] font-semibold"> ({exp.location})</span>
                      )}
                    </div>

                    {/* Réalisations avec sous-puces */}
                    <ul className="space-y-1 pl-1">
                      {exp.achievements.map((ach, i) => (
                        <li key={i} className="text-[10px] text-[#1e293b] flex items-start gap-1.5 leading-snug font-medium">
                          <span className="w-1.5 h-1.5 rounded-full bg-[#1b4477] mt-1 shrink-0" />
                          <span>{ach}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </section>
          </div>

          {/* Pied de page du document */}
          <footer className="pt-3 border-t border-slate-200 flex items-center justify-between text-[9px] text-slate-400">
            <span>Réf: CV-{resume.personalInfo.fullName.replace(/\s+/g, '-').toUpperCase()}</span>
            <span>Édition Professionnelle Haute Définition</span>
          </footer>
        </main>
      </div>
    </div>
  );
};

export default StarterTemplate;
