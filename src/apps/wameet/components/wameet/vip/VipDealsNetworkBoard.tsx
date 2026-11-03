import React, { useState } from 'react';
import {
  Handshake,
  DollarSign,
  TrendingUp,
  ShieldCheck,
  CheckCircle2,
  Clock,
  PlusCircle,
  FileText,
  User,
  Building,
  MapPin,
  Lock,
  Sparkles,
  ArrowRight,
  Filter,
  Check,
  X,
  MessageCircle,
  AlertTriangle,
  BadgeCheck,
  Crown
} from 'lucide-react';
import {
  VipDealRequest,
  VipDealStatus,
  VipDealCategory
} from './types';
import { DEFAULT_VIP_DEAL_REQUESTS } from './mockVipData';
import { playTapBeep, playValidationBeep } from '../../../../../utils/audio';

export interface VipDealsNetworkBoardProps {
  deals?: VipDealRequest[];
  ownerName: string;
  isOwner?: boolean;
  onContactAuthor?: (deal: VipDealRequest) => void;
  className?: string;
}

export const VipDealsNetworkBoard: React.FC<VipDealsNetworkBoardProps> = ({
  deals: initialDeals = DEFAULT_VIP_DEAL_REQUESTS,
  ownerName,
  isOwner = false,
  onContactAuthor,
  className = ''
}) => {
  const [deals, setDeals] = useState<VipDealRequest[]>(initialDeals);
  const [selectedCategory, setSelectedCategory] = useState<'ALL' | VipDealCategory>('ALL');
  const [selectedStatus, setSelectedStatus] = useState<'ALL' | VipDealStatus>('ALL');
  const [isSubmitModalOpen, setIsSubmitModalOpen] = useState(false);
  const [contactedDealIds, setContactedDealIds] = useState<Record<string, boolean>>({});

  // Champs du formulaire de soumission
  const [dealTitle, setDealTitle] = useState('');
  const [dealCategory, setDealCategory] = useState<VipDealCategory>('FINANCING');
  const [dealAmount, setDealAmount] = useState('');
  const [dealCountry, setDealCountry] = useState("Côte d'Ivoire");
  const [dealSummary, setDealSummary] = useState('');
  const [dealCompany, setDealCompany] = useState('');
  const [requiresNda, setRequiresNda] = useState(true);

  // Filtrage
  const filteredDeals = deals.filter((deal) => {
    if (selectedCategory !== 'ALL' && deal.category !== selectedCategory) return false;
    if (selectedStatus !== 'ALL' && deal.status !== selectedStatus) return false;
    return true;
  });

  const handleApproveDeal = (dealId: string) => {
    playValidationBeep();
    setDeals((prev) =>
      prev.map((d) => {
        if (d.id === dealId) {
          return {
            ...d,
            status: 'APPROVED',
            reviewedByOwnerAt: `Validé par ${ownerName} à l’instant`,
            verifiedBadge: true
          };
        }
        return d;
      })
    );
  };

  const handleContactClick = (deal: VipDealRequest) => {
    playValidationBeep();
    setContactedDealIds((prev) => ({ ...prev, [deal.id]: true }));
    onContactAuthor?.(deal);
  };

  const handleSubmitNewDeal = (e: React.FormEvent) => {
    e.preventDefault();
    if (!dealTitle.trim() || !dealSummary.trim()) return;

    playValidationBeep();
    const newDeal: VipDealRequest = {
      id: `deal-${Date.now()}`,
      title: dealTitle.trim(),
      category: dealCategory,
      categoryLabel:
        dealCategory === 'FINANCING'
          ? 'Recherche de Financement'
          : dealCategory === 'PARTNERSHIP'
          ? 'Partenariat Stratégique'
          : dealCategory === 'COFOUNDER'
          ? 'Co-Fondateur / Associé'
          : 'Appel d’Offres Restreint',
      status: 'PENDING',
      targetAmount: dealAmount.trim() || undefined,
      country: dealCountry,
      authorName: 'Vous (Membre VIP)',
      authorCompany: dealCompany.trim() || 'Entreprise Membre',
      authorRole: 'Dirigeant / Fondateur',
      authorAvatar:
        'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=300&auto=format&fit=crop&q=80',
      summary: dealSummary.trim(),
      createdAt: 'À l’instant',
      verifiedBadge: false,
      ndaRequired: requiresNda,
      metrics: {
        teamSize: 5
      }
    };

    setDeals([newDeal, ...deals]);
    setIsSubmitModalOpen(false);

    // Reset champs
    setDealTitle('');
    setDealSummary('');
    setDealAmount('');
    setDealCompany('');
  };

  return (
    <div className={`space-y-6 ${className}`}>
      {/* =====================================================================
          1. HEADER EXECUTIVE DU TABLEAU FINANCEMENT & RÉSEAU
         ===================================================================== */}
      <div className="p-5 sm:p-6 rounded-3xl bg-gradient-to-r from-slate-900 via-slate-850 to-slate-900 border border-amber-500/25 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-5">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center text-slate-950 font-black shadow-[0_0_20px_rgba(245,158,11,0.35)] shrink-0">
            <Handshake className="w-6 h-6 fill-slate-950" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base sm:text-lg font-black text-white">
                Tableau de Financement & Synergies Réseau
              </h3>
              <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                Deals Modérés
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-1 max-w-xl leading-relaxed">
              Espace confidentiel où les membres soumettent des opportunités de co-financement ou de partenariat.
              Chaque requête est scrupuleusement auditée par <strong>{ownerName}</strong> avant diffusion.
            </p>
          </div>
        </div>

        {/* Bouton CTA pour soumettre une requête */}
        <button
          onClick={() => {
            playTapBeep();
            setIsSubmitModalOpen(true);
          }}
          className="px-5 py-3 rounded-2xl bg-gradient-to-r from-amber-500 via-amber-400 to-yellow-500 text-slate-950 font-black text-xs hover:brightness-110 transition-all shadow-[0_0_25px_rgba(245,158,11,0.4)] flex items-center justify-center gap-2 shrink-0"
        >
          <PlusCircle className="w-4 h-4 fill-slate-950" />
          Soumettre une Requête VIP
        </button>
      </div>

      {/* =====================================================================
          2. FILTRES MULTI-CRITÈRES (CATÉGORIES & STATUTS)
         ===================================================================== */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
          <button
            onClick={() => {
              playTapBeep();
              setSelectedCategory('ALL');
            }}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
              selectedCategory === 'ALL'
                ? 'bg-amber-400 text-slate-950 shadow-[0_0_12px_rgba(245,158,11,0.3)]'
                : 'bg-slate-800 text-slate-300 hover:text-white border border-slate-700/60'
            }`}
          >
            Toutes les requêtes ({deals.length})
          </button>
          <button
            onClick={() => {
              playTapBeep();
              setSelectedCategory('FINANCING');
            }}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 whitespace-nowrap ${
              selectedCategory === 'FINANCING'
                ? 'bg-amber-400 text-slate-950 shadow-[0_0_12px_rgba(245,158,11,0.3)]'
                : 'bg-slate-800 text-slate-300 hover:text-white border border-slate-700/60'
            }`}
          >
            <DollarSign className="w-3.5 h-3.5" />
            Financement
          </button>
          <button
            onClick={() => {
              playTapBeep();
              setSelectedCategory('PARTNERSHIP');
            }}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 whitespace-nowrap ${
              selectedCategory === 'PARTNERSHIP'
                ? 'bg-amber-400 text-slate-950 shadow-[0_0_12px_rgba(245,158,11,0.3)]'
                : 'bg-slate-800 text-slate-300 hover:text-white border border-slate-700/60'
            }`}
          >
            <Handshake className="w-3.5 h-3.5" />
            Partenariats
          </button>
          <button
            onClick={() => {
              playTapBeep();
              setSelectedCategory('COFOUNDER');
            }}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 whitespace-nowrap ${
              selectedCategory === 'COFOUNDER'
                ? 'bg-amber-400 text-slate-950 shadow-[0_0_12px_rgba(245,158,11,0.3)]'
                : 'bg-slate-800 text-slate-300 hover:text-white border border-slate-700/60'
            }`}
          >
            <User className="w-3.5 h-3.5" />
            Associés & Co-fondateurs
          </button>
        </div>

        {/* Filtre de statut */}
        <div className="flex items-center gap-1.5 text-xs">
          <span className="text-slate-400 text-[11px] font-bold">Statut :</span>
          <button
            onClick={() => {
              playTapBeep();
              setSelectedStatus('APPROVED');
            }}
            className={`px-2.5 py-1 rounded-lg font-bold text-[11px] transition-all ${
              selectedStatus === 'APPROVED'
                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                : 'bg-slate-800/80 text-slate-400 hover:text-slate-200'
            }`}
          >
            Validés ({deals.filter((d) => d.status === 'APPROVED').length})
          </button>
          <button
            onClick={() => {
              playTapBeep();
              setSelectedStatus('PENDING');
            }}
            className={`px-2.5 py-1 rounded-lg font-bold text-[11px] transition-all ${
              selectedStatus === 'PENDING'
                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                : 'bg-slate-800/80 text-slate-400 hover:text-slate-200'
            }`}
          >
            En Attente ({deals.filter((d) => d.status === 'PENDING').length})
          </button>
          {selectedStatus !== 'ALL' && (
            <button
              onClick={() => setSelectedStatus('ALL')}
              className="text-[10px] text-slate-500 hover:text-white underline ml-1"
            >
              Tous
            </button>
          )}
        </div>
      </div>

      {/* =====================================================================
          3. LISTE DES DEALS & REQUÊTES EN CARTES EXECUTIVE
         ===================================================================== */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {filteredDeals.map((deal) => {
          const isPending = deal.status === 'PENDING';
          const isContacted = contactedDealIds[deal.id];

          return (
            <div
              key={deal.id}
              className={`rounded-3xl p-5 sm:p-6 border transition-all duration-300 relative flex flex-col justify-between ${
                isPending
                  ? 'bg-slate-900/60 border-dashed border-amber-500/40 opacity-90'
                  : 'bg-slate-900 border-slate-800 hover:border-amber-500/40 shadow-xl'
              }`}
            >
              <div>
                {/* Ligne haute : Type & Statut */}
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-lg bg-slate-800 text-amber-300 border border-slate-700">
                      {deal.categoryLabel}
                    </span>
                    <span className="text-[10px] font-medium text-slate-400 flex items-center gap-1">
                      <MapPin className="w-3 h-3 text-slate-500" />
                      {deal.country}
                    </span>
                  </div>

                  {/* Statut de la requête */}
                  {isPending ? (
                    <span className="px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-amber-500/15 text-amber-300 border border-amber-500/30 flex items-center gap-1">
                      <Clock className="w-3 h-3 text-amber-400" />
                      En attente de validation
                    </span>
                  ) : (
                    <span className="px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 flex items-center gap-1">
                      <BadgeCheck className="w-3.5 h-3.5 text-emerald-400" />
                      Validé VIP
                    </span>
                  )}
                </div>

                {/* Titre du Deal */}
                <h4 className="text-base font-black text-white mt-3 leading-snug">
                  {deal.title}
                </h4>

                {/* Montant ciblé si financement */}
                {deal.targetAmount && (
                  <div className="mt-2.5 inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-300 text-xs font-black">
                    <DollarSign className="w-3.5 h-3.5 text-amber-400" />
                    Montant recherché : {deal.targetAmount}
                  </div>
                )}

                {/* Résumé confidentiel */}
                <p className="text-xs text-slate-300 mt-3 leading-relaxed">
                  {deal.summary}
                </p>

                {/* Métriques */}
                {deal.metrics && (
                  <div className="flex items-center gap-3 mt-3 pt-3 border-t border-slate-800 text-[11px] text-slate-400">
                    {deal.metrics.currentRevenue && (
                      <div>
                        CA : <strong className="text-slate-200">{deal.metrics.currentRevenue}</strong>
                      </div>
                    )}
                    {deal.metrics.ebitdaMargin && (
                      <div>
                        EBITDA : <strong className="text-emerald-400">{deal.metrics.ebitdaMargin}</strong>
                      </div>
                    )}
                    {deal.metrics.teamSize && (
                      <div>
                        Équipe : <strong className="text-slate-200">{deal.metrics.teamSize} pers.</strong>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Ligne basse : Auteur et Actions */}
              <div className="mt-5 pt-4 border-t border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-2.5 min-w-0">
                  <img
                    src={deal.authorAvatar}
                    alt={deal.authorName}
                    className="w-8 h-8 rounded-xl object-cover ring-1 ring-slate-700"
                  />
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-white truncate">{deal.authorName}</p>
                    <p className="text-[10px] text-slate-400 truncate">{deal.authorCompany}</p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {/* Si le deal est PENDING et qu'on est l'owner ou en mode admin : bouton de validation */}
                  {isPending && (
                    <button
                      onClick={() => handleApproveDeal(deal.id)}
                      className="px-3 py-1.5 rounded-xl bg-emerald-500/20 hover:bg-emerald-500 text-emerald-300 hover:text-slate-950 font-black text-xs transition-all border border-emerald-500/40 flex items-center gap-1.5"
                      title="Valider en tant qu'expert du salon"
                    >
                      <Check className="w-3.5 h-3.5" />
                      Approuver le Deal
                    </button>
                  )}

                  {/* Bouton de contact */}
                  {!isPending && (
                    <button
                      onClick={() => handleContactClick(deal)}
                      disabled={isContacted}
                      className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                        isContacted
                          ? 'bg-slate-800 text-slate-400 border border-slate-700 cursor-default'
                          : 'bg-amber-400 text-slate-950 hover:brightness-110 font-black shadow-[0_0_12px_rgba(245,158,11,0.3)]'
                      }`}
                    >
                      {isContacted ? (
                        <>
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                          Mise en relation demandée
                        </>
                      ) : (
                        <>
                          <MessageCircle className="w-3.5 h-3.5" />
                          Entrer en contact
                        </>
                      )}
                    </button>
                  )}
                </div>
              </div>

              {/* Mentions de vérification par l'expert */}
              {deal.reviewedByOwnerAt && (
                <div className="mt-2 text-[10px] text-amber-300/80 font-semibold flex items-center gap-1">
                  <ShieldCheck className="w-3 h-3 text-amber-400" />
                  {deal.reviewedByOwnerAt}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* =====================================================================
          4. MODAL DE SOUMISSION DE NOUVELLE REQUÊTE VIP
         ===================================================================== */}
      {isSubmitModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-fade-in">
          <div
            className="w-full max-w-lg rounded-3xl bg-slate-900 border border-amber-500/30 p-6 shadow-2xl text-white space-y-4 max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <Crown className="w-4 h-4 text-amber-400" />
                <h3 className="text-base font-black text-white">Soumettre une Requête de Deal VIP</h3>
              </div>
              <button
                onClick={() => setIsSubmitModalOpen(false)}
                className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-slate-400 leading-relaxed">
              Votre requête sera transmise directement à <strong>{ownerName}</strong> pour vérification et conformité avant d'être rendue visible aux investisseurs et dirigeants du cercle.
            </p>

            <form onSubmit={handleSubmitNewDeal} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-amber-300 mb-1">
                  Titre de la requête / Deal *
                </label>
                <input
                  type="text"
                  required
                  value={dealTitle}
                  onChange={(e) => setDealTitle(e.target.value)}
                  placeholder="Ex : Recherche 40M FCFA expansion usine agro-alimentaire"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-400"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-amber-300 mb-1">Catégorie</label>
                  <select
                    value={dealCategory}
                    onChange={(e) => setDealCategory(e.target.value as VipDealCategory)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-xs text-white focus:outline-none focus:border-amber-400"
                  >
                    <option value="FINANCING">Recherche de Financement</option>
                    <option value="PARTNERSHIP">Partenariat Stratégique</option>
                    <option value="COFOUNDER">Co-Fondateur / Associé</option>
                    <option value="COMMERCIAL_TENDER">Appel d’Offres</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-amber-300 mb-1">Montant Cible (optionnel)</label>
                  <input
                    type="text"
                    value={dealAmount}
                    onChange={(e) => setDealAmount(e.target.value)}
                    placeholder="Ex : 50 000 000 FCFA"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-400"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-amber-300 mb-1">Votre Société / Entité</label>
                  <input
                    type="text"
                    value={dealCompany}
                    onChange={(e) => setDealCompany(e.target.value)}
                    placeholder="Ex : Sahel Agri Logistique"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-400"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-amber-300 mb-1">Pays / Région</label>
                  <input
                    type="text"
                    value={dealCountry}
                    onChange={(e) => setDealCountry(e.target.value)}
                    placeholder="Ex : Côte d'Ivoire, Sénégal"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-xs text-white focus:outline-none focus:border-amber-400"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-amber-300 mb-1">
                  Teaser Exécutif / Résumé du Projet *
                </label>
                <textarea
                  rows={3}
                  required
                  value={dealSummary}
                  onChange={(e) => setDealSummary(e.target.value)}
                  placeholder="Expliquez brièvement l'objet, le besoin de trésorerie ou de partenariat et les garanties apportées..."
                  className="w-full p-3 rounded-xl bg-slate-950 border border-slate-700 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-400"
                />
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="ndaCheckbox"
                  checked={requiresNda}
                  onChange={(e) => setRequiresNda(e.target.checked)}
                  className="rounded border-slate-700 text-amber-400 focus:ring-0"
                />
                <label htmlFor="ndaCheckbox" className="text-xs text-slate-300 select-none">
                  Exiger un accord de non-divulgation (NDA) avant transmission du dossier complet
                </label>
              </div>

              <div className="pt-3 border-t border-slate-800 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsSubmitModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 text-xs text-slate-300"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-amber-400 text-slate-950 font-black text-xs hover:brightness-110 shadow-lg"
                >
                  Transmettre à l'Expert pour Validation
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default VipDealsNetworkBoard;
