import React, { useState, useEffect } from 'react';
import { 
  X, Zap, Flame, Clock, CheckCircle2, ShieldCheck, 
  Sparkles, MessageCircle, ArrowRight, Gift, Award, Lock, ExternalLink 
} from 'lucide-react';
import { LiveProductItem } from './liveStreamAssets';
import { formatCFA, playTapBeep, playValidationBeep } from '../../utils/audio';
import { sanitizeRichHtml } from '../../utils/security';

interface LiveHighTicketDetailModalProps {
  product: LiveProductItem | null;
  isOpen: boolean;
  onClose: () => void;
  onOpenFunnel: (product: LiveProductItem) => void;
  onAddToCart?: (product: LiveProductItem) => void;
  whatsappPhone?: string;
}

export const LiveHighTicketDetailModal: React.FC<LiveHighTicketDetailModalProps> = ({
  product,
  isOpen,
  onClose,
  onOpenFunnel,
  onAddToCart,
  whatsappPhone
}) => {
  const [secondsLeft, setSecondsLeft] = useState(1480); // ~24m 40s

  useEffect(() => {
    if (!isOpen) return;
    const timer = setInterval(() => {
      setSecondsLeft((prev) => (prev > 0 ? prev - 1 : 1800));
    }, 1000);
    return () => clearInterval(timer);
  }, [isOpen]);

  if (!isOpen || !product) return null;

  const minutes = Math.floor(secondsLeft / 60);
  const seconds = secondsLeft % 60;
  const formattedCountdown = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;

  // Calcul du stack de valeur
  const baseValue = Math.round(product.price * 1.6);
  const bonus1Value = 35000;
  const bonus2Value = 25000;
  const bonus3Value = 45000;
  const totalValue = baseValue + bonus1Value + bonus2Value + bonus3Value;
  const totalSavings = totalValue - product.price;

  // Numéro WhatsApp cible
  const cleanPhone = (whatsappPhone || '2250700000000').replace(/[^0-9]/g, '');
  const whatsappUrl = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(
    `Bonjour ! Je regarde actuellement votre direct et j'aimerais avoir plus de détails sur l'offre : ${product.name} (Prix Live : ${product.price} FCFA).`
  )}`;

  const handleCtaClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    playValidationBeep();
    onOpenFunnel(product);
  };

  return (
    <div 
      className="fixed inset-0 z-[960] flex items-center justify-center p-3 sm:p-5 bg-black/85 backdrop-blur-md overflow-y-auto animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div 
        className="relative w-full max-w-4xl bg-[#090A0F] border border-white/20 rounded-3xl shadow-2xl shadow-indigo-950/80 text-white overflow-hidden my-auto max-h-[94vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* ================= 1. BANDEAU SUPÉRIEUR D'URGENCE ================= */}
        <div className="w-full bg-gradient-to-r from-[#FF2A54] via-purple-600 to-[#8B5CF6] px-4 sm:px-6 py-3 flex items-center justify-between gap-3 text-white shrink-0">
          <div className="flex items-center gap-2 text-xs sm:text-sm font-black tracking-wide">
            <span className="text-base animate-pulse">⏳</span>
            <span>Ce tarif préférentiel expire à la fermeture du salon Live !</span>
          </div>

          <div className="flex items-center gap-1.5 bg-black/35 backdrop-blur-md px-3 py-1 rounded-full text-xs font-black tabular-nums border border-white/20">
            <Clock className="w-3.5 h-3.5 text-amber-300" />
            <span>{formattedCountdown}</span>
          </div>
        </div>

        {/* Bouton Fermer */}
        <button
          type="button"
          onClick={() => {
            playTapBeep();
            onClose();
          }}
          className="absolute top-4 right-4 z-20 w-9 h-9 rounded-full bg-black/60 hover:bg-black/90 text-slate-300 hover:text-white flex items-center justify-center transition border border-white/20 cursor-pointer"
          aria-label="Fermer"
        >
          <X className="w-5 h-5" />
        </button>

        {/* ================= CORPS DÉTAILLÉ DU PRODUIT HIGH-TICKET ================= */}
        <div className="p-5 sm:p-7 overflow-y-auto space-y-6 live-scrollbar flex-1">
          
          {/* Rangée Principale : Miniature + Détails Clés */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
            
            {/* Colonne Image (1:1 carré avec reflets studio) */}
            <div className="md:col-span-5 relative aspect-square rounded-2xl bg-[#0F111A] border border-white/15 overflow-hidden p-4 flex items-center justify-center shadow-inner">
              <img 
                src={product.image} 
                alt={product.name} 
                className="w-full h-full object-contain"
              />
              <div className="absolute top-3 left-3 px-2.5 py-1 rounded-full bg-[#FF2A54] text-white text-[10px] font-black uppercase tracking-wider shadow-lg">
                OFFRE DIRECT
              </div>
              {(product.liveLotBadge || product.lotNumber) && (
                <div className="absolute top-3 right-3 px-2.5 py-1 rounded-full bg-black/60 text-white text-[10px] font-black border border-white/20">
                  {product.liveLotBadge || product.lotNumber}
                </div>
              )}
            </div>

            {/* Colonne Titre & Présentation */}
            <div className="md:col-span-7 space-y-3.5">
              <div className="flex items-center gap-2">
                <span className="text-xs font-black uppercase tracking-wider text-indigo-400">
                  {product.category || 'High-Ticket & Masterclass'}
                </span>
                <span className="text-[10px] font-bold text-amber-400 bg-amber-500/20 px-2 py-0.5 rounded-full border border-amber-500/30">
                  Pack Complet Clé-en-main
                </span>
              </div>

              <h2 className="text-xl sm:text-2xl font-black text-white leading-tight">
                {product.name}
              </h2>

              {/* Points Clés Techniques si présents */}
              {product.keyFeatures && product.keyFeatures.length > 0 && (
                <div className="p-2.5 bg-amber-500/10 border border-amber-500/20 rounded-xl space-y-1">
                  {product.keyFeatures.map((feat, idx) => (
                    <div key={idx} className="flex items-center gap-2 text-xs font-semibold text-amber-300">
                      <span className="text-emerald-400 font-bold">✓</span>
                      <span>{feat}</span>
                    </div>
                  ))}
                </div>
              )}

              {(product as any).richDescription || product.description ? (
                <div 
                  className="prose prose-invert max-w-none text-xs sm:text-sm text-slate-300 leading-relaxed [&_h2]:font-bold [&_h2]:text-white [&_h3]:font-bold [&_h3]:text-amber-400 [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5"
                  dangerouslySetInnerHTML={{ __html: sanitizeRichHtml((product as any).richDescription || product.description || '') }}
                />
              ) : (
                <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                  Une solution professionnelle tout-en-un configurée pour maximiser vos résultats, encaisser instantanément et accélérer votre croissance dès cette semaine.
                </p>
              )}

              {/* Jauge d'Urgence */}
              <div className="space-y-1.5 bg-white/[0.04] p-3 rounded-2xl border border-white/[0.08]">
                <div className="flex items-center justify-between text-xs font-bold">
                  <span className="text-[#FF2A54] flex items-center gap-1.5">
                    <Flame className="w-4 h-4 fill-[#FF2A54] animate-pulse" />
                    Place/Stock Prioritaire du Live
                  </span>
                  <span className="text-slate-300">
                    Plus que <strong className="text-amber-400">{product.stockLeft || 3} disponibles</strong>
                  </span>
                </div>
                <div className="w-full h-2 rounded-full bg-white/10 overflow-hidden">
                  <div className="h-full rounded-full live-gauge-incandescent w-[82%]" />
                </div>
              </div>

              {/* Prix Live vs Valeur Totale */}
              <div className="pt-2 flex items-baseline gap-3">
                <span className="text-3xl font-black text-[#F59E0B] tracking-tight tabular-nums">
                  {formatCFA(product.price)}
                </span>
                <span className="text-sm line-through text-slate-400 tabular-nums">
                  {formatCFA(totalValue)}
                </span>
                <span className="px-2.5 py-1 rounded-full bg-emerald-500/20 text-emerald-300 font-extrabold text-xs border border-emerald-500/30">
                  Économie de {formatCFA(totalSavings)}
                </span>
              </div>
            </div>

          </div>

          {/* ================= 2. LA "STACK DE VALEUR" (SPÉCIAL WEBINAIRE & OFFRES GROUPÉES) ================= */}
          <div className="rounded-2xl p-5 bg-[#12141D] border border-white/15 space-y-4 shadow-xl">
            <div className="flex items-center justify-between gap-2 border-b border-white/10 pb-3">
              <div className="flex items-center gap-2">
                <Gift className="w-5 h-5 text-amber-400" />
                <h3 className="text-base font-black text-white">
                  Ce que vous recevez aujourd'hui (Le Stack de Valeur) :
                </h3>
              </div>
              <span className="text-xs font-bold text-amber-400 bg-amber-500/20 px-2.5 py-1 rounded-full border border-amber-500/30">
                Bonus inclus à 100%
              </span>
            </div>

            <div className="space-y-3">
              {/* Item 1 : Produit Principal */}
              <div className="flex items-start justify-between gap-3 p-3 rounded-xl bg-white/[0.03] border border-white/[0.06]">
                <div className="flex items-start gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  <div>
                    <span className="text-xs font-extrabold text-white block">
                      1. {product.name}
                    </span>
                    <span className="text-[11px] text-slate-400">
                      Configuration complète, licence certifiée et accès prioritaire
                    </span>
                  </div>
                </div>
                <span className="text-xs font-bold text-slate-300 tabular-nums shrink-0">
                  Valeur : {formatCFA(baseValue)}
                </span>
              </div>

              {/* Bonus 1 */}
              <div className="flex items-start justify-between gap-3 p-3 rounded-xl bg-indigo-950/30 border border-indigo-500/20">
                <div className="flex items-start gap-2.5">
                  <Gift className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                  <div>
                    <span className="text-xs font-extrabold text-indigo-200 block">
                      2. Bonus VIP #1 : Accès Privé au Cercle Mastermind WhatsApp & Support VIP
                    </span>
                    <span className="text-[11px] text-slate-400">
                      Échange direct avec les formateurs et entraide avec les entrepreneurs élites
                    </span>
                  </div>
                </div>
                <span className="text-xs font-bold text-amber-300 tabular-nums shrink-0">
                  Valeur : {formatCFA(bonus1Value)}
                </span>
              </div>

              {/* Bonus 2 */}
              <div className="flex items-start justify-between gap-3 p-3 rounded-xl bg-indigo-950/30 border border-indigo-500/20">
                <div className="flex items-start gap-2.5">
                  <Gift className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                  <div>
                    <span className="text-xs font-extrabold text-indigo-200 block">
                      3. Bonus VIP #2 : Pack 50 Templates de Tunnels Dépliables & Scripts Prêts à l'Emploi
                    </span>
                    <span className="text-[11px] text-slate-400">
                      Copiez-collez des structures à forte conversion sans perdre de temps
                    </span>
                  </div>
                </div>
                <span className="text-xs font-bold text-amber-300 tabular-nums shrink-0">
                  Valeur : {formatCFA(bonus2Value)}
                </span>
              </div>

              {/* Bonus 3 */}
              <div className="flex items-start justify-between gap-3 p-3 rounded-xl bg-indigo-950/30 border border-indigo-500/20">
                <div className="flex items-start gap-2.5">
                  <Award className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                  <div>
                    <span className="text-xs font-extrabold text-indigo-200 block">
                      4. Bonus VIP #3 : Session de Coaching Live & Audit Personnalisé 30 Jours
                    </span>
                    <span className="text-[11px] text-slate-400">
                      Accompagnement pas-à-pas pour sécuriser vos premiers encaissements
                    </span>
                  </div>
                </div>
                <span className="text-xs font-bold text-amber-300 tabular-nums shrink-0">
                  Valeur : {formatCFA(bonus3Value)}
                </span>
              </div>
            </div>

            {/* Total Stack récapitulatif */}
            <div className="pt-3 border-t border-white/10 flex flex-col sm:flex-row items-center justify-between gap-2 text-center sm:text-left">
              <div>
                <span className="text-xs text-slate-400 block">
                  Valeur Totale Cumulée Réelle : <strong className="line-through text-rose-400">{formatCFA(totalValue)}</strong>
                </span>
                <span className="text-xs font-black text-emerald-400">
                  Aujourd'hui pendant le Live : Économisez {formatCFA(totalSavings)} !
                </span>
              </div>

              <div className="text-2xl font-black text-[#F59E0B] tabular-nums">
                {formatCFA(product.price)}
              </div>
            </div>
          </div>

          {/* ================= 3. BADGES DE RÉASSURANCE "ZÉRO RISQUE" ================= */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-center">
            <div className="p-3 rounded-xl bg-white/[0.03] border border-white/[0.06] flex flex-col items-center gap-1.5">
              <ShieldCheck className="w-5 h-5 text-emerald-400" />
              <span className="text-xs font-bold text-white">Paiement 100% Sécurisé</span>
              <span className="text-[10px] text-slate-400">Encaissement Wave, OM & Cartes via SebPay</span>
            </div>

            <div className="p-3 rounded-xl bg-white/[0.03] border border-white/[0.06] flex flex-col items-center gap-1.5">
              <Zap className="w-5 h-5 text-indigo-400" />
              <span className="text-xs font-bold text-white">Accès / Expédition Prioritaire</span>
              <span className="text-[10px] text-slate-400">Livraison 24h ou accès immédiat débloqué</span>
            </div>

            <div className="p-3 rounded-xl bg-white/[0.03] border border-white/[0.06] flex flex-col items-center gap-1.5">
              <Award className="w-5 h-5 text-amber-400" />
              <span className="text-xs font-bold text-white">Garantie Zéro Risque</span>
              <span className="text-[10px] text-slate-400">Satisfait ou remboursé sous 30 jours</span>
            </div>
          </div>

          {/* ================= 4. BOUTON D'ACTION & SUPPORT WHATSAPP ================= */}
          <div className="space-y-3 pt-2">
            
            {/* Gros Bouton d'Achat : Ouvre le SlideOutFunnel sans couper la vidéo */}
            <button
              type="button"
              onClick={handleCtaClick}
              className="w-full py-4 px-6 rounded-2xl text-sm sm:text-base font-black uppercase tracking-wider text-white live-btn-accent flex items-center justify-center gap-2.5 shadow-xl shadow-indigo-600/40 cursor-pointer transition active:scale-98"
            >
              <Zap className="w-5 h-5 text-amber-300 fill-amber-300" />
              <span>⚡ Saisir l'Offre & Tous les Bonus Maintenant</span>
              <ArrowRight className="w-5 h-5" />
            </button>

            {/* Bouton Support WhatsApp en Direct */}
            <a
              href={whatsappUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full py-2.5 px-4 rounded-xl text-xs font-bold text-emerald-300 bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/30 flex items-center justify-center gap-2 transition cursor-pointer"
            >
              <MessageCircle className="w-4 h-4 text-emerald-400" />
              <span>💬 Une question pendant le Live ? Écrivez-nous sur WhatsApp</span>
            </a>

          </div>

        </div>

      </div>
    </div>
  );
};
