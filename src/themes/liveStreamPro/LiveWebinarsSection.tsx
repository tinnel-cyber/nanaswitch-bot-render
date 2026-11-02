import React from 'react';
import { 
  GraduationCap, Calendar, Users, CheckCircle2, Play, 
  Sparkles, ArrowRight, Video, ShieldCheck, Clock 
} from 'lucide-react';
import { LiveWebinarItem, DEMO_LIVE_WEBINARS } from './liveStreamAssets';
import { formatCFA, playValidationBeep, playTapBeep } from '../../utils/audio';

interface LiveWebinarsSectionProps {
  webinars?: LiveWebinarItem[];
  onOpenWebinarFunnel: (webinar: LiveWebinarItem) => void;
}

export const LiveWebinarsSection: React.FC<LiveWebinarsSectionProps> = ({
  webinars = DEMO_LIVE_WEBINARS,
  onOpenWebinarFunnel
}) => {
  const handleCtaClick = (webinar: LiveWebinarItem, e: React.MouseEvent) => {
    e.stopPropagation();
    playValidationBeep();
    onOpenWebinarFunnel(webinar);
  };

  return (
    <section className="w-full py-12 border-t border-white/[0.08]" aria-label="Webinaires et Replays VIP">
      <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* ================= EN-TÊTE DE LA SECTION ================= */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-indigo-400 animate-pulse" />
              <span className="text-xs font-black uppercase tracking-wider text-indigo-400 flex items-center gap-1.5">
                <GraduationCap className="w-4 h-4 text-indigo-400" />
                Formations & Conférences Privées
              </span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
              🎓 Sessions Masterclass & Replays VIP
            </h2>
            <p className="text-xs sm:text-sm text-[#94A3B8] max-w-2xl">
              Développez vos compétences avec les meilleurs stratèges du e-commerce et de la vente en ligne en Afrique. Accédez aux replays 4K ou réservez votre accès en direct.
            </p>
          </div>

          <div className="flex items-center gap-2 self-start md:self-auto shrink-0 text-xs text-indigo-300 bg-indigo-500/10 px-3.5 py-2 rounded-2xl border border-indigo-500/20 shadow-sm">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>Accès Certifié & Support Dédié</span>
          </div>
        </div>

        {/* ================= GRILLE 3 COLONNES DES WEBINAIRES ================= */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-7">
          {webinars.map((webinar) => (
            <div
              key={webinar.id}
              onClick={(e) => handleCtaClick(webinar, e)}
              className="live-drop-card flex flex-col justify-between group cursor-pointer border border-white/[0.08] hover:border-indigo-500/60 transition-all duration-300 bg-[#12141D]"
            >
              {/* Conteneur Affiche (Format 16:9) */}
              <div className="relative w-full aspect-video bg-gradient-to-br from-indigo-950 via-[#0B0D14] to-purple-950/80 p-4 flex flex-col justify-between overflow-hidden select-none">
                
                {/* Badge Date ou Replay Disponible */}
                <div className="flex items-center justify-between gap-2 z-10">
                  <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider flex items-center gap-1 shadow-md ${
                    webinar.isReplayAvailable
                      ? 'bg-emerald-500 text-slate-950'
                      : 'bg-indigo-600/90 text-white border border-indigo-400/40 backdrop-blur-md'
                  }`}>
                    {webinar.isReplayAvailable ? (
                      <>
                        <Play className="w-3 h-3 fill-current" />
                        <span>{webinar.dateBadge}</span>
                      </>
                    ) : (
                      <>
                        <Calendar className="w-3 h-3" />
                        <span>{webinar.dateBadge}</span>
                      </>
                    )}
                  </span>

                  {webinar.replayDuration && (
                    <span className="text-[10px] font-bold text-slate-300 bg-black/60 px-2 py-0.5 rounded-full border border-white/10 flex items-center gap-1">
                      <Clock className="w-2.5 h-2.5 text-amber-300" />
                      <span>{webinar.replayDuration}</span>
                    </span>
                  )}
                </div>

                {/* Speaker incrusté en bas à gauche de la miniature */}
                <div className="flex items-center gap-2.5 z-10 bg-black/60 backdrop-blur-md p-1.5 pr-3 rounded-full border border-white/15 w-fit">
                  <div className={`w-8 h-8 rounded-full bg-gradient-to-tr ${webinar.speaker.avatarColor} flex items-center justify-center text-xs font-black text-white shadow-md border border-white/20 shrink-0`}>
                    {webinar.speaker.name.charAt(0)}
                  </div>
                  <div className="leading-tight">
                    <span className="block text-xs font-black text-white">
                      {webinar.speaker.name}
                    </span>
                    <span className="block text-[10px] text-slate-300 font-medium">
                      {webinar.speaker.role}
                    </span>
                  </div>
                </div>

                {/* Effet lumineux de survol */}
                <div className="absolute inset-0 bg-indigo-600/10 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
              </div>

              {/* Corps de la Carte Webinaire */}
              <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
                
                {/* Titre & Catégorie */}
                <div className="space-y-1.5">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-indigo-400">
                    {webinar.category}
                  </span>
                  <h3 className="text-base sm:text-lg font-black text-white leading-snug group-hover:text-indigo-200 transition-colors">
                    {webinar.title}
                  </h3>
                </div>

                {/* 3 Points Clés Appris durant la Session */}
                <div className="space-y-2 py-2 border-y border-white/[0.06]">
                  <span className="text-[11px] font-extrabold uppercase text-slate-400 tracking-wider block">
                    Ce que vous allez maîtriser :
                  </span>
                  {webinar.keyTakeaways.map((point, pIdx) => (
                    <div key={pIdx} className="flex items-start gap-2 text-xs text-slate-200">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                      <span className="leading-tight">{point}</span>
                    </div>
                  ))}
                </div>

                {/* Pied de Carte : Nombre d'Inscrits & Bouton Réserver */}
                <div className="space-y-3 pt-1">
                  
                  {/* Nombre d'inscrits & Prix */}
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-1.5 text-slate-300 font-bold bg-white/[0.04] px-2.5 py-1 rounded-xl border border-white/[0.06]">
                      <Users className="w-3.5 h-3.5 text-indigo-400" />
                      <span>{webinar.attendeesCount} participants inscrits</span>
                    </div>

                    {webinar.price !== undefined && (
                      <div className="text-right">
                        {webinar.price === 0 ? (
                          <span className="text-xs font-black text-emerald-400 uppercase">
                            Accès Gratuit VIP
                          </span>
                        ) : (
                          <span className="text-sm font-black text-[#F59E0B] tabular-nums">
                            {formatCFA(webinar.price)}
                          </span>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Bouton Réserver mon accès VIP (ou Visionner le Replay) */}
                  <button
                    type="button"
                    onClick={(e) => handleCtaClick(webinar, e)}
                    className="w-full py-3 px-4 rounded-xl text-xs sm:text-xs font-extrabold uppercase tracking-wider text-white live-btn-accent flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-indigo-600/30 transition active:scale-98"
                  >
                    {webinar.isReplayAvailable ? (
                      <>
                        <Play className="w-3.5 h-3.5 fill-current" />
                        <span>Visionner le Replay VIP</span>
                      </>
                    ) : (
                      <>
                        <GraduationCap className="w-3.5 h-3.5 text-amber-300" />
                        <span>Réserver mon accès VIP</span>
                      </>
                    )}
                    <ArrowRight className="w-3.5 h-3.5 ml-1" />
                  </button>

                </div>

              </div>
            </div>
          ))}
        </div>

      </div>
    </section>
  );
};
