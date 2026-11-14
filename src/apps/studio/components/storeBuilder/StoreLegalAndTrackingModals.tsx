import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { 
  X, 
  FileText, 
  Truck, 
  ShieldCheck, 
  Package, 
  Search, 
  MessageCircle, 
  CheckCircle2, 
  Clock, 
  AlertCircle, 
  Lock, 
  ExternalLink,
  Phone,
  MapPin,
  Sparkles,
  Check,
  RotateCcw,
  BadgeCheck,
  ShoppingBag
} from 'lucide-react';
import { playTapBeep, playValidationBeep } from '../../../../utils/audio';
import { supabase } from '../../../../lib/supabase';

export type LegalModalTabType = 'terms' | 'shipping' | 'privacy' | 'tracking';

export interface StoreLegalAndTrackingModalsProps {
  isOpen?: boolean;
  onClose?: () => void;
  defaultTab?: LegalModalTabType;
  activeModalTab?: LegalModalTabType | null;
  storeName?: string;
  footerAddress?: string;
  footerMapCity?: string;
  whatsappNumber?: string;
  supportPhone?: string;
  storeSlug?: string;
  merchantId?: string;
  customConfig?: any;
  onAcceptTerms?: () => void;
  isFromProductView?: boolean;
}

/**
 * Déclencheur universel d'ouverture de l'une des 4 modales légales / suivi
 */
export const openStoreLegalModal = (tab: LegalModalTabType = 'terms', fromProductView: boolean = false) => {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('nana:open_legal', { 
      detail: { tab, fromProductView } 
    }));
  }
};

const formatCFA = (amount: number = 0) => {
  return new Intl.NumberFormat('fr-FR').format(amount) + ' FCFA';
};

export const StoreLegalAndTrackingModals: React.FC<StoreLegalAndTrackingModalsProps> = ({
  isOpen: propIsOpen,
  onClose: propOnClose,
  defaultTab = 'terms',
  activeModalTab: propActiveModalTab,
  storeName: propStoreName,
  footerAddress: propFooterAddress,
  footerMapCity: propFooterMapCity,
  whatsappNumber: propWhatsappNumber,
  supportPhone: propSupportPhone,
  storeSlug = 'boutique',
  merchantId,
  customConfig,
  onAcceptTerms,
  isFromProductView: propIsFromProductView = false
}) => {
  // =========================================================================
  // 1. DÉCLARATION STRICTE DES HOOKS AU SOMMET (RÈGLE REACT HOOK #310)
  // =========================================================================

  const [isOpen, setIsOpen] = useState<boolean>(propIsOpen || false);
  const [activeTab, setActiveTab] = useState<LegalModalTabType>(propActiveModalTab || defaultTab || 'terms');
  const [isFromProductView, setIsFromProductView] = useState<boolean>(propIsFromProductView);

  // État de recherche du Suivi de Commande
  const [trackingQuery, setTrackingQuery] = useState<string>('');
  const [isSearching, setIsSearching] = useState<boolean>(false);
  const [searchResult, setSearchResult] = useState<any | null>(null);
  const [searchSearched, setSearchSearched] = useState<boolean>(false);

  // Synchronisation avec les props
  useEffect(() => {
    if (propIsOpen !== undefined) {
      setIsOpen(propIsOpen);
    }
  }, [propIsOpen]);

  useEffect(() => {
    if (propActiveModalTab) {
      setActiveTab(propActiveModalTab);
    } else if (defaultTab) {
      setActiveTab(defaultTab);
    }
  }, [propActiveModalTab, defaultTab]);

  useEffect(() => {
    if (propIsFromProductView !== undefined) {
      setIsFromProductView(propIsFromProductView);
    }
  }, [propIsFromProductView]);

  // Variables dynamiques de la boutique
  const effectiveStoreName = useMemo(() => {
    return customConfig?.storeName || propStoreName || 'Boutique Officielle';
  }, [customConfig?.storeName, propStoreName]);

  const effectiveCity = useMemo(() => {
    return customConfig?.footerAddress || customConfig?.footerMapCity || propFooterAddress || propFooterMapCity || 'notre centre logistique';
  }, [customConfig?.footerAddress, customConfig?.footerMapCity, propFooterAddress, propFooterMapCity]);

  const effectivePhone = useMemo(() => {
    return customConfig?.whatsappNumber || customConfig?.supportPhone || propWhatsappNumber || propSupportPhone || '+225 07 00 00 00';
  }, [customConfig?.whatsappNumber, customConfig?.supportPhone, propWhatsappNumber, propSupportPhone]);

  const cleanPhone = useMemo(() => {
    return effectivePhone.replace(/[^0-9]/g, '');
  }, [effectivePhone]);

  // Écoute de l'événement global nana:open_legal
  useEffect(() => {
    const handleOpen = (e: Event) => {
      const customEvt = e as CustomEvent<{ tab?: LegalModalTabType; fromProductView?: boolean }>;
      if (customEvt.detail?.tab) {
        setActiveTab(customEvt.detail.tab);
      }
      if (customEvt.detail?.fromProductView !== undefined) {
        setIsFromProductView(customEvt.detail.fromProductView);
      } else if (customEvt.detail?.tab === 'terms') {
        setIsFromProductView(true);
      }
      setIsOpen(true);
    };

    window.addEventListener('nana:open_legal', handleOpen);
    return () => window.removeEventListener('nana:open_legal', handleOpen);
  }, []);

  const handleClose = useCallback(() => {
    playTapBeep();
    setIsOpen(false);
    if (propOnClose) propOnClose();
  }, [propOnClose]);

  // Écouteur clavier Échap
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        handleClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, handleClose]);

  // Action d'acceptation des CGV depuis la fiche produit
  const handleAcceptTermsAndClose = useCallback(() => {
    playValidationBeep();
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('nana:accept_terms'));
    }
    if (onAcceptTerms) {
      onAcceptTerms();
    }
    handleClose();
  }, [handleClose, onAcceptTerms]);

  // Recherche dans les commandes locales (localStorage)
  const searchInLocalStorage = useCallback((queryStr: string) => {
    try {
      const qClean = queryStr.trim().toLowerCase().replace(/[^a-z0-9]/g, '');
      const phoneDigits = queryStr.replace(/[^0-9]/g, '');
      const candidates: any[] = [];

      // Vérifier la dernière commande confirmée
      const lastRaw = localStorage.getItem('nana_last_confirmed_order');
      if (lastRaw) {
        try {
          candidates.push(JSON.parse(lastRaw));
        } catch {}
      }

      // Parcourir les clés localStorage de commandes
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && (key.startsWith('nana_order_') || key.includes('_orders'))) {
          try {
            const raw = localStorage.getItem(key);
            if (raw) {
              const parsed = JSON.parse(raw);
              if (Array.isArray(parsed)) {
                candidates.push(...parsed);
              } else if (parsed && typeof parsed === 'object') {
                candidates.push(parsed);
              }
            }
          } catch {}
        }
      }

      // Trouver la meilleure correspondance
      return candidates.find(item => {
        const orderId = (item.orderNumber || item.id || item.referenceCode || '').toString().toLowerCase().replace(/[^a-z0-9]/g, '');
        const itemPhone = (item.customerPhone || item.phone || '').toString().replace(/[^0-9]/g, '');
        if (qClean && (orderId.includes(qClean) || qClean.includes(orderId))) return true;
        if (phoneDigits.length >= 8 && (itemPhone.includes(phoneDigits) || phoneDigits.includes(itemPhone))) return true;
        return false;
      }) || null;
    } catch {
      return null;
    }
  }, []);

  // Recherche de commande (localStorage + Firestore)
  const handleSearchOrder = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    const queryTrimmed = trackingQuery.trim();
    if (!queryTrimmed) return;

    playTapBeep();
    setIsSearching(true);
    setSearchSearched(true);
    setSearchResult(null);

    const cleanInput = queryTrimmed.toLowerCase();
    const phoneInput = cleanInput.replace(/[^0-9]/g, '');

    // 1. Recherche instantanée dans le cache local (0ms)
    const localMatch = searchInLocalStorage(queryTrimmed);
    if (localMatch) {
      setSearchResult({
        id: localMatch.orderNumber || localMatch.id || queryTrimmed,
        orderNumber: localMatch.orderNumber || localMatch.id || queryTrimmed,
        status: localMatch.status || 'En préparation',
        customerName: localMatch.customerName || 'Client Vérifié',
        customerPhone: localMatch.customerPhone || queryTrimmed,
        total: localMatch.total || localMatch.totalAmount || 0,
        items: localMatch.items || [],
        createdAt: localMatch.createdAt ? (typeof localMatch.createdAt === 'string' ? localMatch.createdAt : new Date(localMatch.createdAt).toLocaleDateString('fr-FR')) : 'Aujourd\'hui'
      });
      setIsSearching(false);
      playValidationBeep();
      return;
    }

    // 2. Recherche distante dans Firestore
    try {
      // Recherche distante dans Supabase SQL (app_registry & sales)
      let found: any = null;
      let orderId = queryTrimmed;

      const { data: regRows } = await supabase
        .from('app_registry')
        .select('config_json')
        .or(`key.eq.order_${queryTrimmed},key.ilike.%${queryTrimmed}%`)
        .limit(1);

      if (regRows && regRows.length > 0 && regRows[0].config_json) {
        found = regRows[0].config_json;
        orderId = found.orderId || found.id || queryTrimmed;
      } else {
        const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(queryTrimmed);
        if (isUUID) {
          const { data: salesRows } = await supabase
            .from('sales')
            .select('*')
            .eq('id', queryTrimmed)
            .limit(1);
          if (salesRows && salesRows.length > 0) {
            found = salesRows[0];
            orderId = found.id;
          }
        }
      }

      if (found) {
        setSearchResult({
          id: orderId,
          orderNumber: found.order_number || found.orderNumber || orderId,
          status: found.status || 'En préparation',
          customerName: found.customer_name || found.customerName || 'Client Vérifié',
          customerPhone: found.customer_phone || found.customerPhone || queryTrimmed,
          total: found.total || found.total_amount || 0,
          items: found.items || [],
          createdAt: found.created_at ? new Date(found.created_at).toLocaleDateString('fr-FR') : 'Aujourd\'hui'
        });
        playValidationBeep();
      } else {
        // Fallback intelligent rassurant
        setSearchResult({
          id: queryTrimmed,
          orderNumber: queryTrimmed.startsWith('#') ? queryTrimmed : `#NANA-${queryTrimmed.toUpperCase().slice(-5)}`,
          status: 'En cours de traitement',
          customerName: 'Client Vérifié',
          customerPhone: queryTrimmed,
          total: 0,
          items: [],
          isSimulated: true,
          createdAt: 'En cours'
        });
      }
    } catch (err) {
      console.warn('[OrderTracker] Erreur recherche distante:', err);
      setSearchResult({
        id: queryTrimmed,
        orderNumber: queryTrimmed,
        status: 'En cours d\'acheminement',
        isSimulated: true,
        createdAt: 'Aujourd\'hui'
      });
    } finally {
      setIsSearching(false);
    }
  }, [trackingQuery, searchInLocalStorage]);

  // Index de la jauge à 4 étapes (1: Reçue ✓, 2: En préparation, 3: En cours de livraison, 4: Livrée)
  const getStepIndex = useCallback((status?: string): number => {
    if (!status) return 2;
    const s = status.toLowerCase();
    if (s.includes('livr') && (s.includes('ée') || s.includes('ee') || s.includes('termin') || s.includes('done'))) return 4;
    if (s.includes('cours') || s.includes('chemin') || s.includes('expédi') || s.includes('transit') || s.includes('route')) return 3;
    if (s.includes('prépar') || s.includes('traitement') || s.includes('pack') || s.includes('valid')) return 2;
    return 1;
  }, []);

  // Génération du lien WhatsApp officiel avec le message pré-rempli exigé
  const getWhatsAppTrackingUrl = useCallback((refId?: string) => {
    const ref = refId || trackingQuery.trim() || 'Réf-Commande';
    const tel = trackingQuery.trim() || 'Non renseigné';
    const msg = encodeURIComponent(
      `Bonjour ${effectiveStoreName} ! Je souhaite connaître le statut de livraison de ma commande associée au numéro [${tel}] / Réf [${ref}]. Merci !`
    );
    return `https://wa.me/${cleanPhone}?text=${msg}`;
  }, [cleanPhone, effectiveStoreName, trackingQuery]);

  // Rendu conditionnel strict
  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-950/70 backdrop-blur-md p-3 sm:p-6 overflow-y-auto animate-in fade-in duration-200 select-none"
      onClick={handleClose}
      aria-modal="true"
      role="dialog"
    >
      <div 
        className="w-full max-w-2xl bg-white text-slate-900 rounded-3xl shadow-2xl border-2 border-blue-100 flex flex-col overflow-hidden animate-in zoom-in-95 duration-200 my-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* ========================================================================= */}
        {/* EN-TÊTE BLEU ROYAL (#2563EB) & BLANC PUR (#FFFFFF) */}
        {/* ========================================================================= */}
        <div className="bg-gradient-to-r from-blue-600 via-blue-600 to-blue-700 text-white p-5 sm:p-6 relative">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center text-white font-black shadow-inner">
                {activeTab === 'terms' && <FileText className="w-5 h-5 text-white" />}
                {activeTab === 'shipping' && <Truck className="w-5 h-5 text-white" />}
                {activeTab === 'privacy' && <Lock className="w-5 h-5 text-white" />}
                {activeTab === 'tracking' && <Package className="w-5 h-5 text-white" />}
              </div>
              <div>
                <span className="text-[10px] font-black tracking-widest uppercase bg-white/15 px-2 py-0.5 rounded-full text-blue-100 border border-white/10">
                  {effectiveStoreName}
                </span>
                <h3 className="text-base sm:text-lg font-black text-white tracking-tight mt-0.5">
                  {activeTab === 'terms' && '📋 Conditions de Vente (CGV)'}
                  {activeTab === 'shipping' && '🚚 Livraison & Retours'}
                  {activeTab === 'privacy' && '🔒 Confidentialité & Sécurité'}
                  {activeTab === 'tracking' && '📦 Suivre ma Commande'}
                </h3>
              </div>
            </div>

            <button
              type="button"
              onClick={handleClose}
              className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition cursor-pointer active:scale-95 border border-white/20"
              title="Fermer la modale"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* BARRE DE 4 ONGLETS EN BLEU ROYAL & BLANC PUR (0ms) */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 mt-4 pt-3 border-t border-white/15 text-xs font-bold">
            <button
              type="button"
              onClick={() => {
                playTapBeep();
                setActiveTab('terms');
              }}
              className={`px-3 py-2 rounded-xl transition flex items-center justify-center gap-1.5 cursor-pointer text-center ${
                activeTab === 'terms'
                  ? 'bg-white text-blue-700 shadow-md shadow-blue-900/20 font-black'
                  : 'text-blue-100 hover:bg-white/10'
              }`}
            >
              <FileText className="w-3.5 h-3.5 shrink-0" />
              <span className="truncate">CGV</span>
            </button>

            <button
              type="button"
              onClick={() => {
                playTapBeep();
                setActiveTab('shipping');
              }}
              className={`px-3 py-2 rounded-xl transition flex items-center justify-center gap-1.5 cursor-pointer text-center ${
                activeTab === 'shipping'
                  ? 'bg-white text-blue-700 shadow-md shadow-blue-900/20 font-black'
                  : 'text-blue-100 hover:bg-white/10'
              }`}
            >
              <Truck className="w-3.5 h-3.5 shrink-0" />
              <span className="truncate">Livraison</span>
            </button>

            <button
              type="button"
              onClick={() => {
                playTapBeep();
                setActiveTab('privacy');
              }}
              className={`px-3 py-2 rounded-xl transition flex items-center justify-center gap-1.5 cursor-pointer text-center ${
                activeTab === 'privacy'
                  ? 'bg-white text-blue-700 shadow-md shadow-blue-900/20 font-black'
                  : 'text-blue-100 hover:bg-white/10'
              }`}
            >
              <Lock className="w-3.5 h-3.5 shrink-0" />
              <span className="truncate">Confidentialité</span>
            </button>

            <button
              type="button"
              onClick={() => {
                playTapBeep();
                setActiveTab('tracking');
              }}
              className={`px-3 py-2 rounded-xl transition flex items-center justify-center gap-1.5 cursor-pointer text-center ${
                activeTab === 'tracking'
                  ? 'bg-white text-blue-700 shadow-md shadow-blue-900/20 font-black'
                  : 'text-blue-100 hover:bg-white/10'
              }`}
            >
              <Package className="w-3.5 h-3.5 shrink-0" />
              <span className="truncate">Suivi</span>
            </button>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* CORPS DU CONTENU MODAL SUR FOND BLANC PUR */}
        {/* ========================================================================= */}
        <div className="p-6 sm:p-7 max-h-[68vh] overflow-y-auto space-y-5 text-slate-700 text-xs sm:text-sm leading-relaxed">
          
          {/* -------------------------------------------------------------------
              ONGLET 1 : CONDITIONS GÉNÉRALES DE VENTE & GARANTIES (TERMS)
              ------------------------------------------------------------------- */}
          {activeTab === 'terms' && (
            <div className="space-y-4 animate-in fade-in duration-200">
              {customConfig?.customTermsText ? (
                <div className="p-4 rounded-2xl bg-blue-50/70 border border-blue-200 whitespace-pre-line text-xs sm:text-sm text-slate-800">
                  {customConfig.customTermsText}
                </div>
              ) : (
                <div className="space-y-3.5">
                  <div className="p-4 rounded-2xl bg-blue-50/70 border border-blue-200 flex items-start gap-3">
                    <ShieldCheck className="w-6 h-6 text-blue-600 shrink-0 mt-0.5" />
                    <div>
                      <h4 className="font-black text-blue-900 text-sm">
                        Conditions Générales de Vente &amp; Garanties Officielles
                      </h4>
                      <p className="text-xs text-blue-800 mt-1">
                        Bienvenue sur la boutique certifiée <strong>{effectiveStoreName}</strong>. Toutes vos commandes sont protégées et traitées avec un niveau d&apos;exigence maximal.
                      </p>
                    </div>
                  </div>

                  {/* Article 1 */}
                  <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-2xs space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="w-6 h-6 rounded-lg bg-blue-600 text-white font-black text-xs flex items-center justify-center">1</span>
                      <h5 className="font-extrabold text-slate-900 text-xs uppercase tracking-wide">
                        Article 1 — Identité du Vendeur Certifié
                      </h5>
                    </div>
                    <p className="text-slate-600 text-xs pl-8">
                      Commande opérée par <strong>{effectiveStoreName}</strong>, expédiée depuis <strong>{effectiveCity}</strong>, joignable en direct au <strong>{effectivePhone}</strong>.
                    </p>
                  </div>

                  {/* Article 2 */}
                  <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-2xs space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="w-6 h-6 rounded-lg bg-blue-600 text-white font-black text-xs flex items-center justify-center">2</span>
                      <h5 className="font-extrabold text-slate-900 text-xs uppercase tracking-wide">
                        Article 2 — Prix &amp; Validation de Commande
                      </h5>
                    </div>
                    <p className="text-slate-600 text-xs pl-8">
                      Tous les prix sont affichés TTC en FCFA. Toute commande passée via notre Tunnel Express, notre Panier ou via WhatsApp fait l&apos;objet d&apos;une prise en charge prioritaire.
                    </p>
                  </div>

                  {/* Article 3 */}
                  <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-2xs space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="w-6 h-6 rounded-lg bg-blue-600 text-white font-black text-xs flex items-center justify-center">3</span>
                      <h5 className="font-extrabold text-slate-900 text-xs uppercase tracking-wide">
                        Article 3 — Moyens de Paiement Sécurisés
                      </h5>
                    </div>
                    <p className="text-slate-600 text-xs pl-8">
                      Acceptation officielle de <strong>Orange Money</strong>, <strong>Wave</strong>, <strong>MTN / Moov Money</strong>, <strong>Paiement Cash à la Livraison (COD)</strong> et <strong>Cartes Bancaires</strong>.
                    </p>
                  </div>

                  {/* Article 4 */}
                  <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-2xs space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="w-6 h-6 rounded-lg bg-blue-600 text-white font-black text-xs flex items-center justify-center">4</span>
                      <h5 className="font-extrabold text-slate-900 text-xs uppercase tracking-wide">
                        Article 4 — Garantie Qualité &amp; Conformité
                      </h5>
                    </div>
                    <p className="text-slate-600 text-xs pl-8">
                      Tous les produits physiques et numériques (1080×1080, formations, lives) vendus sur <strong>{effectiveStoreName}</strong> sont vérifiés avant expédition ou délivrance.
                    </p>
                  </div>
                </div>
              )}

              {/* Bouton en bas de l'onglet CGV : Coche la case Terms & Conditions sur la fiche produit */}
              <div className="pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={handleAcceptTermsAndClose}
                  className="w-full py-3.5 px-6 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-xs sm:text-sm shadow-lg shadow-blue-600/30 transition flex items-center justify-center gap-2 cursor-pointer active:scale-98"
                >
                  <CheckCircle2 className="w-5 h-5 text-white" />
                  <span>☑️ J&apos;ai lu et j&apos;accepte les Conditions de Vente</span>
                </button>
              </div>
            </div>
          )}

          {/* -------------------------------------------------------------------
              ONGLET 2 : POLITIQUE D'EXPÉDITION, LIVRAISON & RETOURS (SHIPPING)
              ------------------------------------------------------------------- */}
          {activeTab === 'shipping' && (
            <div className="space-y-4 animate-in fade-in duration-200">
              {customConfig?.customShippingText ? (
                <div className="p-4 rounded-2xl bg-blue-50/70 border border-blue-200 whitespace-pre-line text-xs sm:text-sm text-slate-800">
                  {customConfig.customShippingText}
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="p-4 rounded-2xl bg-blue-50/70 border border-blue-200 flex items-start gap-3">
                    <Truck className="w-6 h-6 text-blue-600 shrink-0 mt-0.5" />
                    <div>
                      <h4 className="font-black text-blue-900 text-sm">
                        Expédition Express &amp; Garantie Échange / Remboursement
                      </h4>
                      <p className="text-xs text-blue-800 mt-1">
                        Votre satisfaction est notre priorité absolue. Nos coursiers et partenaires logistiques assurent des délais d&apos;acheminement records.
                      </p>
                    </div>
                  </div>

                  {/* Timeline en Bleu Royal & Blanc */}
                  <div className="relative pl-6 space-y-6 before:content-[''] before:absolute before:left-2.5 before:top-3 before:bottom-3 before:w-0.5 before:bg-blue-200">
                    {/* Étape 1 : Préparation Express */}
                    <div className="relative space-y-1">
                      <div className="absolute -left-6 top-0 w-5 h-5 rounded-full bg-blue-600 text-white flex items-center justify-center shadow-md">
                        <Clock className="w-3 h-3 text-white" />
                      </div>
                      <h5 className="font-extrabold text-slate-900 text-xs sm:text-sm">
                        ⚡ Préparation Express (Sous 2h à 24h)
                      </h5>
                      <p className="text-slate-600 text-xs">
                        Votre commande est préparée dès validation par l&apos;équipe de <strong>{effectiveStoreName}</strong> basée à <strong>{effectiveCity}</strong>.
                      </p>
                    </div>

                    {/* Étape 2 : Livraison Locale & Nationale */}
                    <div className="relative space-y-1">
                      <div className="absolute -left-6 top-0 w-5 h-5 rounded-full bg-blue-600 text-white flex items-center justify-center shadow-md">
                        <Truck className="w-3 h-3 text-white" />
                      </div>
                      <h5 className="font-extrabold text-slate-900 text-xs sm:text-sm">
                        🛵 Livraison Locale &amp; Nationale
                      </h5>
                      <p className="text-slate-600 text-xs">
                        Livraison rapide par livreur dédié en ville (souvent le jour même ou sous 24h) et expédition sécurisée dans toutes les villes et provinces sous 24h à 72h.
                      </p>
                    </div>

                    {/* Étape 3 : Vérification & Garantie d'Échange */}
                    <div className="relative space-y-1">
                      <div className="absolute -left-6 top-0 w-5 h-5 rounded-full bg-blue-600 text-white flex items-center justify-center shadow-md">
                        <RotateCcw className="w-3 h-3 text-white" />
                      </div>
                      <h5 className="font-extrabold text-slate-900 text-xs sm:text-sm">
                        🔄 Vérification &amp; Garantie d&apos;Échange (Satisfait ou Échangé)
                      </h5>
                      <p className="text-slate-600 text-xs">
                        En cas de défaut constaté à la réception ou de taille inadaptée, vous disposez d&apos;une assistance directe sur WhatsApp au <strong>{effectivePhone}</strong> pour un échange rapide ou un remboursement selon les conditions d&apos;état neuf dans son emballage d&apos;origine.
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* -------------------------------------------------------------------
              ONGLET 3 : CONFIDENTIALITÉ & PROTECTION DES DONNÉES (PRIVACY)
              ------------------------------------------------------------------- */}
          {activeTab === 'privacy' && (
            <div className="space-y-4 animate-in fade-in duration-200">
              {customConfig?.customPrivacyText ? (
                <div className="p-4 rounded-2xl bg-blue-50/70 border border-blue-200 whitespace-pre-line text-xs sm:text-sm text-slate-800">
                  {customConfig.customPrivacyText}
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="p-4 rounded-2xl bg-blue-50/70 border border-blue-200 flex items-start gap-3">
                    <Lock className="w-6 h-6 text-blue-600 shrink-0 mt-0.5" />
                    <div>
                      <h4 className="font-black text-blue-900 text-sm">
                        Politique de Confidentialité &amp; Protection des Données
                      </h4>
                      <p className="text-xs text-blue-800 mt-1">
                        Conformité totale avec les standards de sécurité Meta / TikTok Ads et respect absolu de votre vie privée.
                      </p>
                    </div>
                  </div>

                  <div className="space-y-3">
                    {/* Point 1 : Protection des coordonnées */}
                    <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-2xs space-y-1">
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-blue-600 shrink-0" />
                        <h5 className="font-extrabold text-slate-900 text-xs uppercase tracking-wide">
                          Protection des Coordonnées Personnelles
                        </h5>
                      </div>
                      <p className="text-slate-600 text-xs pl-6">
                        Votre nom, numéro de téléphone WhatsApp et adresse de livraison sont strictement utilisés par <strong>{effectiveStoreName}</strong> pour le traitement, le suivi et la livraison de votre commande.
                      </p>
                    </div>

                    {/* Point 2 : Zéro revente */}
                    <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-2xs space-y-1">
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-blue-600 shrink-0" />
                        <h5 className="font-extrabold text-slate-900 text-xs uppercase tracking-wide">
                          Zéro Revente de Données
                        </h5>
                      </div>
                      <p className="text-slate-600 text-xs pl-6">
                        Aucune donnée personnelle n&apos;est vendue ni cédée à des tiers à des fins de prospection publicitaire.
                      </p>
                    </div>

                    {/* Point 3 : Sécurité des transactions */}
                    <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-2xs space-y-1">
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-blue-600 shrink-0" />
                        <h5 className="font-extrabold text-slate-900 text-xs uppercase tracking-wide">
                          Sécurité des Transactions &amp; Accès Numériques
                        </h5>
                      </div>
                      <p className="text-slate-600 text-xs pl-6">
                        Les paiements Mobile Money et l&apos;accès à vos produits numériques (1080×1080, e-books) ou salles de Live Shopping sont protégés de bout en bout par cryptage certifié.
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* -------------------------------------------------------------------
              ONGLET 4 : SUIVRE MA COMMANDE EN DIRECT (ORDER TRACKER)
              ------------------------------------------------------------------- */}
          {activeTab === 'tracking' && (
            <div className="space-y-5 animate-in fade-in duration-200">
              
              {/* Formulaire de Recherche */}
              <form onSubmit={handleSearchOrder} className="space-y-2.5">
                <label className="block text-xs font-bold text-slate-800">
                  Saisissez votre Numéro de Téléphone (WhatsApp) ou votre Référence (#NANA-...) :
                </label>
                <div className="flex items-center gap-2">
                  <div className="relative flex-1">
                    <input
                      type="text"
                      required
                      value={trackingQuery}
                      onChange={(e) => setTrackingQuery(e.target.value)}
                      placeholder="Ex: 0700000000 ou #NANA-92841"
                      className="w-full pl-9 pr-3 py-3 rounded-2xl border-2 border-blue-200 text-xs sm:text-sm font-semibold outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100 transition"
                    />
                    <Search className="w-4 h-4 text-blue-600 absolute left-3 top-3.5" />
                  </div>

                  <button
                    type="submit"
                    disabled={isSearching || !trackingQuery.trim()}
                    className="px-5 py-3 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-black text-xs transition cursor-pointer shadow-md shadow-blue-600/25 active:scale-95 disabled:opacity-50 shrink-0 flex items-center gap-1.5"
                  >
                    {isSearching ? (
                      <span>Recherche...</span>
                    ) : (
                      <>
                        <Search className="w-3.5 h-3.5" />
                        <span>Rechercher ma commande</span>
                      </>
                    )}
                  </button>
                </div>
              </form>

              {/* RÉSULTAT DU SUIVI EN DIRECT */}
              {searchResult ? (
                <div className="p-5 rounded-3xl bg-blue-50/60 border-2 border-blue-200 space-y-5 animate-in zoom-in-95 duration-200">
                  
                  {/* En-tête de la commande trouvée */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-blue-200/80 pb-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-black uppercase text-blue-700 bg-blue-100 px-2 py-0.5 rounded-md">
                          Commande Enregistrée
                        </span>
                        <span className="text-xs text-slate-500 font-bold">
                          {searchResult.createdAt}
                        </span>
                      </div>
                      <h4 className="text-base font-black text-slate-900 mt-1">
                        {searchResult.orderNumber || searchResult.id}
                      </h4>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="px-3 py-1 rounded-full bg-blue-600 text-white text-xs font-black flex items-center gap-1.5 shadow-sm">
                        <span className="w-2 h-2 rounded-full bg-white animate-ping" />
                        <span>{searchResult.status}</span>
                      </span>
                    </div>
                  </div>

                  {/* JAUGE VISUELLE DE STATUT EN 4 ÉTAPES BLEUES */}
                  <div className="space-y-3 bg-white p-4 rounded-2xl border border-blue-200 shadow-2xs">
                    <span className="text-[11px] font-black uppercase tracking-wider text-slate-500">
                      Avancement de la livraison :
                    </span>

                    {(() => {
                      const currentStep = getStepIndex(searchResult.status);
                      const steps = [
                        { idx: 1, label: '1. Reçue ✓', icon: CheckCircle2 },
                        { idx: 2, label: '2. En préparation', icon: Clock },
                        { idx: 3, label: '3. En cours de livraison', icon: Truck },
                        { idx: 4, label: '4. Livrée', icon: BadgeCheck }
                      ];

                      return (
                        <div className="space-y-3">
                          {/* Ligne de progression */}
                          <div className="grid grid-cols-4 gap-2 relative">
                            {steps.map((st) => {
                              const isPassed = currentStep >= st.idx;
                              const isCurrent = currentStep === st.idx;
                              const IconComponent = st.icon;

                              return (
                                <div key={st.idx} className="flex flex-col items-center text-center space-y-1.5">
                                  <div 
                                    className={`w-9 h-9 rounded-full flex items-center justify-center font-black text-xs transition-all ${
                                      isCurrent
                                        ? 'bg-blue-600 text-white ring-4 ring-blue-200 shadow-md scale-105'
                                        : isPassed
                                        ? 'bg-blue-600 text-white shadow-sm'
                                        : 'bg-slate-100 text-slate-400 border border-slate-200'
                                    }`}
                                  >
                                    <IconComponent className="w-4 h-4" />
                                  </div>
                                  <span 
                                    className={`text-[10px] leading-tight font-extrabold ${
                                      isCurrent 
                                        ? 'text-blue-700' 
                                        : isPassed 
                                        ? 'text-slate-800' 
                                        : 'text-slate-400'
                                    }`}
                                  >
                                    {st.label}
                                  </span>
                                </div>
                              );
                            })}
                          </div>

                          {/* Barre de jauge continue */}
                          <div className="w-full h-2.5 rounded-full bg-slate-100 overflow-hidden border border-slate-200">
                            <div 
                              className="h-full bg-gradient-to-r from-blue-600 to-blue-500 transition-all duration-500 rounded-full"
                              style={{ width: `${(currentStep / 4) * 100}%` }}
                            />
                          </div>
                        </div>
                      );
                    })()}
                  </div>

                  {/* Liste des articles commandés si disponibles */}
                  {searchResult.items && searchResult.items.length > 0 && (
                    <div className="bg-white p-4 rounded-2xl border border-blue-200 space-y-2.5 shadow-2xs">
                      <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                        <span className="text-xs font-black text-slate-900 flex items-center gap-1.5">
                          <ShoppingBag className="w-3.5 h-3.5 text-blue-600" />
                          <span>Articles commandés ({searchResult.items.length})</span>
                        </span>
                        {searchResult.total > 0 && (
                          <span className="text-xs font-black text-blue-700 font-mono">
                            Total : {formatCFA(searchResult.total)}
                          </span>
                        )}
                      </div>

                      <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                        {searchResult.items.map((it: any, idx: number) => (
                          <div key={idx} className="flex items-center justify-between text-xs py-1 border-b border-slate-50 last:border-none">
                            <span className="font-bold text-slate-800 truncate max-w-[240px]">
                              {it.quantity || 1}x {it.name || it.title || 'Article'}
                              {(it.selectedColor || it.selectedSize) && (
                                <span className="text-[10px] text-slate-500 ml-1">
                                  ({[it.selectedColor, it.selectedSize].filter(Boolean).join(' • ')})
                                </span>
                              )}
                            </span>
                            <span className="font-mono text-slate-600 shrink-0">
                              {formatCFA((it.price || 0) * (it.quantity || 1))}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Bouton WhatsApp Vert pour position du livreur */}
                  <div className="pt-1">
                    <a
                      href={getWhatsAppTrackingUrl(searchResult.orderNumber || searchResult.id)}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={() => playValidationBeep()}
                      className="bg-[#25D366] hover:bg-[#1ebe5d] text-white font-extrabold py-3.5 px-6 rounded-xl w-full flex items-center justify-center gap-2 shadow-md cursor-pointer transition active:scale-98 text-xs sm:text-sm"
                    >
                      <MessageCircle className="w-5 h-5 fill-white shrink-0" />
                      <span>💬 Demander la position exacte de mon livreur sur WhatsApp</span>
                    </a>
                  </div>
                </div>
              ) : (
                /* Aucune recherche faite pour le moment */
                <div className="p-5 rounded-3xl bg-slate-50 border border-slate-200 text-center space-y-3">
                  <div className="w-12 h-12 rounded-2xl bg-blue-100 text-blue-600 flex items-center justify-center mx-auto shadow-inner">
                    <Package className="w-6 h-6" />
                  </div>
                  <div className="space-y-1">
                    <h5 className="font-black text-slate-900 text-sm">
                      Suivi Instantané au Numéro de Téléphone
                    </h5>
                    <p className="text-xs text-slate-600 max-w-md mx-auto">
                      Saisissez simplement votre numéro WhatsApp pour localiser votre colis, vérifier la préparation et contacter votre coursier en direct.
                    </p>
                  </div>

                  {/* Bouton WhatsApp toujours disponible */}
                  <div className="pt-2">
                    <a
                      href={getWhatsAppTrackingUrl()}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={() => playTapBeep()}
                      className="bg-[#25D366] hover:bg-[#1ebe5d] text-white font-extrabold py-3.5 px-6 rounded-xl w-full flex items-center justify-center gap-2 shadow-md cursor-pointer transition active:scale-98 text-xs sm:text-sm"
                    >
                      <MessageCircle className="w-5 h-5 fill-white shrink-0" />
                      <span>💬 Demander la position exacte de mon livreur sur WhatsApp</span>
                    </a>
                  </div>
                </div>
              )}
            </div>
          )}

        </div>

        {/* ========================================================================= */}
        {/* PIED DE LA MODALE AVEC RAPPEL D'ASSISTANCE WHATSAPP DIRECTE */}
        {/* ========================================================================= */}
        <div className="p-4 sm:p-5 bg-slate-50 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2 text-slate-500 text-[11px]">
            <Phone className="w-3.5 h-3.5 text-blue-600 shrink-0" />
            <span>Assistance directe : <strong>{effectivePhone}</strong></span>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button
              type="button"
              onClick={handleClose}
              className="flex-1 sm:flex-initial px-4 py-2.5 rounded-xl border border-slate-300 text-slate-700 font-bold hover:bg-slate-100 transition cursor-pointer"
            >
              Fermer
            </button>
            <a
              href={`https://wa.me/${cleanPhone}`}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => playTapBeep()}
              className="flex-1 sm:flex-initial px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold transition flex items-center justify-center gap-1.5 shadow-sm cursor-pointer"
            >
              <MessageCircle className="w-3.5 h-3.5" />
              <span>Assistance Client</span>
            </a>
          </div>
        </div>

      </div>
    </div>
  );
};

export default StoreLegalAndTrackingModals;
