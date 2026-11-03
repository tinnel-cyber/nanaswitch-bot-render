import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { 
  Check, 
  CheckCircle2, 
  Copy, 
  MessageCircle, 
  Printer, 
  Download, 
  ExternalLink, 
  Package, 
  Truck, 
  ShieldCheck, 
  FileText, 
  Sparkles, 
  X, 
  Clock, 
  MapPin, 
  Phone, 
  ArrowRight,
  Tv,
  GraduationCap,
  BookOpen,
  Lock,
  QrCode
} from 'lucide-react';
import { playTapBeep, playValidationBeep, formatCFA } from '../../../../utils/audio';
import { trackPurchase } from '../../../../utils/pixelTrackingEngine';

export interface OrderVaultItem {
  id?: string;
  name: string;
  price: number;
  quantity: number;
  image?: string;
  category?: string;
  color?: string;
  size?: string;
  isDigital?: boolean;
  downloadUrl?: string;
  liveSessionSlug?: string;
}

export interface OrderVaultData {
  orderId: string;
  orderNumber?: string;
  storeName?: string;
  storeSlug?: string;
  sellerAddress?: string;
  whatsappNumber?: string;
  customerName?: string;
  customerPhone?: string;
  deliveryAddress?: string;
  paymentMethod?: string;
  items: OrderVaultItem[];
  subtotal: number;
  deliveryFee?: number;
  total: number;
  isDigitalOrder?: boolean;
  liveSessionSlug?: string;
  downloadUrl?: string;
  digitalCoverUrl?: string;
  createdAt?: string;
}

export interface OrderConfirmationVaultModalProps {
  isOpen?: boolean;
  onClose?: () => void;
  orderData?: OrderVaultData | null;
  storeName?: string;
  footerAddress?: string;
  whatsappNumber?: string;
  storeSlug?: string;
}

/**
 * Déclencheur universel d'ouverture du Coffre de Confirmation Post-Achat
 */
export const triggerOrderConfirmationVault = (data: Partial<OrderVaultData>) => {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('nana:open_order_vault', { detail: data }));
  }
};

export const OrderConfirmationVaultModal: React.FC<OrderConfirmationVaultModalProps> = ({
  isOpen: propIsOpen,
  onClose: propOnClose,
  orderData: propOrderData,
  storeName: propStoreName,
  footerAddress: propFooterAddress,
  whatsappNumber: propWhatsappNumber,
  storeSlug: propStoreSlug
}) => {
  // =========================================================================
  // 1. DÉCLARATION STRICTE DES HOOKS AU SOMMET (RÈGLE REACT HOOK #310)
  // =========================================================================

  const [isOpen, setIsOpen] = useState<boolean>(propIsOpen || false);
  const [orderData, setOrderData] = useState<OrderVaultData | null>(propOrderData || null);
  const [copiedRef, setCopiedRef] = useState<boolean>(false);
  const [showPrintInvoice, setShowPrintInvoice] = useState<boolean>(false);

  // Synchronisation avec les props
  useEffect(() => {
    if (propIsOpen !== undefined) {
      setIsOpen(propIsOpen);
    }
  }, [propIsOpen]);

  useEffect(() => {
    if (propOrderData) {
      setOrderData(propOrderData);
    }
  }, [propOrderData]);

  // Écoute de l'événement universel nana:open_order_vault
  useEffect(() => {
    const handleOpenVault = (e: Event) => {
      const customEvt = e as CustomEvent<Partial<OrderVaultData>>;
      if (customEvt.detail) {
        const detail = customEvt.detail;
        const now = new Date();
        const fallbackId = `NANA-${Date.now().toString().slice(-6)}`;
        
        const fullData: OrderVaultData = {
          orderId: detail.orderId || fallbackId,
          orderNumber: detail.orderNumber || detail.orderId || fallbackId,
          storeName: detail.storeName || propStoreName || 'Boutique Officielle',
          storeSlug: detail.storeSlug || propStoreSlug || 'boutique',
          sellerAddress: detail.sellerAddress || propFooterAddress || 'Abidjan, Côte d\'Ivoire',
          whatsappNumber: detail.whatsappNumber || propWhatsappNumber || '+225 07 00 00 00',
          customerName: detail.customerName || 'Client Estimé',
          customerPhone: detail.customerPhone || '',
          deliveryAddress: detail.deliveryAddress || 'Adresse enregistrée',
          paymentMethod: detail.paymentMethod || 'Paiement à la livraison',
          items: detail.items && detail.items.length > 0 ? detail.items : [
            {
              name: 'Commande Nanasore Élite',
              price: detail.total || 15000,
              quantity: 1
            }
          ],
          subtotal: detail.subtotal || detail.total || 15000,
          deliveryFee: detail.deliveryFee || 0,
          total: detail.total || 15000,
          isDigitalOrder: detail.isDigitalOrder || false,
          liveSessionSlug: detail.liveSessionSlug,
          downloadUrl: detail.downloadUrl,
          digitalCoverUrl: detail.digitalCoverUrl,
          createdAt: detail.createdAt || now.toLocaleDateString('fr-FR', {
            day: '2-digit',
            month: 'long',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
          })
        };

        setOrderData(fullData);
        setIsOpen(true);
        playValidationBeep();

        // Tracking Pixel : Déclenchement automatique de l'événement Purchase
        trackPurchase({
          orderId: fullData.orderId,
          total: fullData.total,
          subtotal: fullData.subtotal,
          items: fullData.items?.map(it => ({
            name: it.name,
            price: it.price,
            quantity: it.quantity,
            category: it.category
          }))
        });
      }
    };

    window.addEventListener('nana:open_order_vault', handleOpenVault);
    return () => window.removeEventListener('nana:open_order_vault', handleOpenVault);
  }, [propStoreName, propStoreSlug, propFooterAddress, propWhatsappNumber]);

  // Écouteur clavier Échap
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        handleClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  const effectiveStoreName = useMemo(() => {
    return orderData?.storeName || propStoreName || 'Boutique Officielle';
  }, [orderData?.storeName, propStoreName]);

  const effectiveAddress = useMemo(() => {
    return orderData?.sellerAddress || propFooterAddress || 'Abidjan, Côte d\'Ivoire';
  }, [orderData?.sellerAddress, propFooterAddress]);

  const effectivePhone = useMemo(() => {
    return orderData?.whatsappNumber || propWhatsappNumber || '+225 07 00 00 00';
  }, [orderData?.whatsappNumber, propWhatsappNumber]);

  const cleanPhone = useMemo(() => {
    return effectivePhone.replace(/[^0-9]/g, '');
  }, [effectivePhone]);

  const referenceCode = useMemo(() => {
    const rawId = orderData?.orderNumber || orderData?.orderId || 'CMD-777';
    const cleanId = rawId.replace(/^#/, '').replace(/^NANA-/, '');
    return `NANA-${cleanId.slice(-6).toUpperCase()}`;
  }, [orderData?.orderNumber, orderData?.orderId]);

  // Détection de la nature de la commande (Numérique vs Physique)
  const isDigitalNature = useMemo(() => {
    if (!orderData) return false;
    if (orderData.isDigitalOrder) return true;
    if (orderData.liveSessionSlug) return true;
    if (orderData.downloadUrl) return true;

    // Vérification des catégories ou noms d'articles
    return (orderData.items || []).some(item => {
      const cat = (item.category || '').toLowerCase();
      const name = (item.name || '').toLowerCase();
      return (
        item.isDigital ||
        cat.includes('digital') ||
        cat.includes('formation') ||
        cat.includes('ebook') ||
        cat.includes('webinaire') ||
        cat.includes('cours') ||
        cat.includes('logiciel') ||
        name.includes('formation') ||
        name.includes('e-book') ||
        name.includes('masterclass') ||
        name.includes('webinaire')
      );
    });
  }, [orderData]);

  // Image d'affiche 1080x1080 pour le produit numérique
  const digitalVisualUrl = useMemo(() => {
    if (orderData?.digitalCoverUrl) return orderData.digitalCoverUrl;
    const digitalItem = orderData?.items?.find(i => i.image);
    if (digitalItem?.image) return digitalItem.image;
    return 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=1080&h=1080&auto=format&fit=crop&q=85';
  }, [orderData]);

  // QR Code de suivi officiel
  const trackingQrUrl = useMemo(() => {
    const trackingLink = `https://nsore.shop/s/${orderData?.storeSlug || propStoreSlug || 'boutique'}?product=${encodeURIComponent(referenceCode)}`;
    return `https://api.qrserver.com/v1/create-qr-code/?size=160x160&data=${encodeURIComponent(trackingLink)}&color=2563eb&bgcolor=ffffff`;
  }, [orderData?.storeSlug, propStoreSlug, referenceCode]);

  // Lien WhatsApp direct avec Bon de commande préformaté
  const whatsappOrderUrl = useMemo(() => {
    if (!orderData) return `https://wa.me/${cleanPhone}`;
    
    let msg = `🎉 *BON DE COMMANDE OFFICIEL — #${referenceCode}*\n`;
    msg += `Boutique : *${effectiveStoreName}*\n\n`;
    msg += `👤 *Client :* ${orderData.customerName || 'Client'}\n`;
    if (orderData.customerPhone) msg += `📞 *Téléphone :* ${orderData.customerPhone}\n`;
    if (orderData.deliveryAddress) msg += `📍 *Adresse de livraison :* ${orderData.deliveryAddress}\n\n`;
    
    msg += `📦 *ARTICLES COMMANDÉS :*\n`;
    (orderData.items || []).forEach((item, idx) => {
      const variant = [item.color, item.size].filter(Boolean).join(' - ');
      msg += `• ${item.quantity}x ${item.name}${variant ? ` (${variant})` : ''} — ${formatCFA(item.price * item.quantity)}\n`;
    });
    
    msg += `\n💵 *TOTAL À PAYER :* ${formatCFA(orderData.total)}\n`;
    msg += `💳 *Mode de paiement :* ${orderData.paymentMethod || 'Paiement à la livraison'}\n\n`;
    msg += `Bonjour ${effectiveStoreName}, je viens de valider ma commande #${referenceCode}. Merci de confirmer la prise en charge et le délai de livraison !`;

    return `https://wa.me/${cleanPhone}?text=${encodeURIComponent(msg)}`;
  }, [orderData, referenceCode, effectiveStoreName, cleanPhone]);

  // Copie de la référence
  const handleCopyRef = useCallback(() => {
    playTapBeep();
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(`#${referenceCode}`);
      setCopiedRef(true);
      setTimeout(() => setCopiedRef(false), 2500);
    }
  }, [referenceCode]);

  // Impression de la facture
  const handlePrint = useCallback(() => {
    playValidationBeep();
    window.print();
  }, []);

  const handleClose = useCallback(() => {
    playTapBeep();
    setIsOpen(false);
    setShowPrintInvoice(false);
    if (propOnClose) propOnClose();
  }, [propOnClose]);

  // Si pas ouvert ou pas de données, ne rien rendre
  if (!isOpen || !orderData) return null;

  return (
    <div 
      className="fixed inset-0 z-[10000] flex items-center justify-center bg-slate-950/75 backdrop-blur-md p-3 sm:p-6 overflow-y-auto animate-in fade-in duration-200 select-none print:p-0 print:bg-white print:static"
      onClick={handleClose}
    >
      <div 
        className="w-full max-w-2xl bg-white text-slate-900 rounded-3xl shadow-2xl border-2 border-blue-100 flex flex-col overflow-hidden animate-in zoom-in-95 duration-200 my-auto print:border-none print:shadow-none print:rounded-none print:max-w-none"
        onClick={(e) => e.stopPropagation()}
      >
        {/* ========================================================================= */}
        {/* 1. EN-TÊTE DE CÉLÉBRATION BLEU ROYAL (#2563EB) & BLANC PUR */}
        {/* ========================================================================= */}
        <div className="bg-gradient-to-r from-blue-600 via-blue-600 to-blue-700 text-white p-6 sm:p-8 text-center relative overflow-hidden print:hidden">
          {/* Motifs géométriques décoratifs */}
          <div className="absolute top-0 right-0 w-48 h-48 bg-white/5 rounded-full blur-2xl pointer-events-none" />
          <div className="absolute bottom-0 left-0 w-36 h-36 bg-blue-400/20 rounded-full blur-xl pointer-events-none" />

          {/* Bouton fermeture discret en haut à droite */}
          <button
            type="button"
            onClick={handleClose}
            className="absolute top-4 right-4 w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition cursor-pointer border border-white/20 active:scale-95"
            title="Fermer"
          >
            <X className="w-5 h-5" />
          </button>

          {/* Coche Animée en Bleu Royal sur fond blanc éclatant */}
          <div className="relative mb-3 flex items-center justify-center">
            <div className="w-16 h-16 rounded-full bg-white text-blue-600 flex items-center justify-center mx-auto shadow-xl shadow-blue-900/30 ring-4 ring-white/30 animate-in zoom-in-50 duration-300">
              <Check className="w-9 h-9 stroke-[3] text-blue-600" />
            </div>
            <span className="absolute -top-1 right-1/2 translate-x-8 text-amber-300 animate-bounce text-xl">
              ✨
            </span>
          </div>

          <div className="space-y-1">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/15 text-blue-100 text-xs font-black uppercase tracking-wider border border-white/20 backdrop-blur-sm">
              <Sparkles className="w-3.5 h-3.5 text-amber-300" />
              <span>CONFIRMATION INSTANTANÉE • {effectiveStoreName}</span>
            </span>

            <h2 className="text-xl sm:text-3xl font-black text-white tracking-tight pt-1">
              🎉 Commande Enregistrée avec Succès !
            </h2>

            <p className="text-xs sm:text-sm text-blue-100/90 max-w-md mx-auto pt-1 font-medium">
              Merci pour votre confiance, <strong className="text-white">{orderData.customerName || 'cher client'}</strong>. Votre commande a été transmise en direct au service d&apos;expédition.
            </p>
          </div>

          {/* Numéro de Référence Unique avec Bouton Copier */}
          <div className="mt-4 inline-flex items-center gap-2.5 bg-white/10 backdrop-blur-md px-4 py-2 rounded-2xl border border-white/25 shadow-inner">
            <span className="text-xs font-medium text-blue-100">Réf :</span>
            <strong className="text-sm sm:text-base font-black text-white tracking-wider font-mono">
              #{referenceCode}
            </strong>
            <button
              type="button"
              onClick={handleCopyRef}
              className="p-1.5 rounded-lg bg-white/15 hover:bg-white/30 text-white transition cursor-pointer active:scale-95 flex items-center gap-1 text-[11px] font-bold"
              title="Copier la référence"
            >
              {copiedRef ? <Check className="w-3.5 h-3.5 text-emerald-300" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copiedRef ? 'Copié !' : 'Copier'}</span>
            </button>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* 2. CORPS DU COFFRE (ADAPTATION PHYSIQUE VS NUMÉRIQUE) */}
        {/* ========================================================================= */}
        <div className="p-6 sm:p-8 space-y-6 max-h-[65vh] overflow-y-auto print:max-h-none print:overflow-visible print:p-4">
          
          {/* =======================================================================
              CAS A : PRODUIT PHYSIQUE (Cosmétique, Électronique, Mode, etc.)
              ======================================================================= */}
          {!isDigitalNature && (
            <div className="space-y-5 animate-in fade-in duration-200">
              
              {/* Timeline de Livraison à 3 Étapes en Bleu Royal */}
              <div className="p-4 sm:p-5 rounded-2xl bg-blue-50/70 border border-blue-200 space-y-3">
                <span className="text-xs font-black uppercase tracking-wider text-blue-900 block flex items-center gap-1.5">
                  <Truck className="w-4 h-4 text-blue-600" />
                  <span>Timeline d&apos;Acheminement en Direct</span>
                </span>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-1">
                  {/* Étape 1 : Commande Reçue */}
                  <div className="p-3 rounded-xl bg-white border border-blue-200 shadow-2xs space-y-1">
                    <div className="flex items-center gap-1.5 text-blue-600 font-black text-xs">
                      <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                      <span>1. Reçue (✓)</span>
                    </div>
                    <p className="text-[11px] text-slate-500 leading-snug">
                      Enregistrée dans le système de <strong>{effectiveStoreName}</strong>
                    </p>
                  </div>

                  {/* Étape 2 : Préparation */}
                  <div className="p-3 rounded-xl bg-white border border-blue-200 shadow-2xs space-y-1">
                    <div className="flex items-center gap-1.5 text-blue-600 font-black text-xs">
                      <Package className="w-4 h-4 text-blue-600 shrink-0 animate-pulse" />
                      <span>2. Préparation</span>
                    </div>
                    <p className="text-[11px] text-slate-500 leading-snug truncate" title={effectiveAddress}>
                      Au départ de {effectiveAddress}
                    </p>
                  </div>

                  {/* Étape 3 : Livraison */}
                  <div className="p-3 rounded-xl bg-white border border-blue-200 shadow-2xs space-y-1">
                    <div className="flex items-center gap-1.5 text-blue-600 font-black text-xs">
                      <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                      <span>3. Remise en main</span>
                    </div>
                    <p className="text-[11px] text-slate-500 leading-snug">
                      Vérification colis + Paiement à réception
                    </p>
                  </div>
                </div>
              </div>

              {/* Bouton Prioritaire WhatsApp Vendeur */}
              <div className="space-y-2">
                <a
                  href={whatsappOrderUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => playValidationBeep()}
                  className="w-full bg-[#25D366] hover:bg-[#1ebe5d] active:scale-98 text-white font-extrabold text-sm py-4 px-6 rounded-2xl shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-2.5 transition-all cursor-pointer"
                >
                  <MessageCircle className="w-5 h-5 fill-white shrink-0" />
                  <span>💬 Envoyer mon Bon de Commande sur WhatsApp pour accélérer la livraison</span>
                </a>
                <p className="text-[11px] text-center text-slate-400">
                  Le commerçant valide instantanément votre créneau horaire sur WhatsApp.
                </p>
              </div>

            </div>
          )}

          {/* =======================================================================
              CAS B : PRODUIT NUMÉRIQUE (Formation, E-book, Logiciel, Webinaire)
              ======================================================================= */}
          {isDigitalNature && (
            <div className="space-y-5 animate-in fade-in duration-200">
              
              {/* Encadré : 🔓 Votre Coffre d'Accès Numérique avec l'affiche 1080x1080 */}
              <div className="p-5 rounded-3xl bg-slate-900 text-white border-2 border-blue-500 shadow-xl space-y-4">
                <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                  <div className="flex items-center gap-2">
                    <span className="text-xl">🔓</span>
                    <div>
                      <h4 className="text-sm font-black text-white uppercase tracking-wider">
                        Votre Coffre d&apos;Accès Numérique
                      </h4>
                      <span className="text-[10px] text-emerald-400 font-bold">
                        Accès 100% Débloqué &amp; Garanti à Vie
                      </span>
                    </div>
                  </div>
                  <span className="px-2.5 py-1 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-[10px] font-black uppercase">
                    Prêt
                  </span>
                </div>

                {/* Visuel 1080x1080 Centré & Élégant */}
                <div className="flex flex-col sm:flex-row items-center gap-4 bg-slate-950/80 p-4 rounded-2xl border border-slate-800">
                  <div className="w-28 h-28 sm:w-32 sm:h-32 rounded-2xl overflow-hidden border-2 border-blue-500/60 shadow-lg shrink-0 aspect-square">
                    <img
                      src={digitalVisualUrl}
                      alt="Affiche Numérique 1080x1080"
                      className="w-full h-full object-cover"
                    />
                  </div>

                  <div className="space-y-1.5 text-center sm:text-left min-w-0">
                    <span className="text-[10px] font-black uppercase text-blue-400 bg-blue-950/80 px-2 py-0.5 rounded-full border border-blue-800/80">
                      Ressource Haute Définition (1080×1080)
                    </span>
                    <h5 className="font-extrabold text-sm sm:text-base text-white truncate">
                      {orderData.items?.[0]?.name || 'Formation & Pack Digital'}
                    </h5>
                    <p className="text-xs text-slate-300 leading-snug">
                      Votre lien d&apos;accès, supports de cours et accès webinaire sont prêts à être consultés.
                    </p>
                  </div>
                </div>

                {/* Boutons d'Action Numérique */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                  {/* Bouton 1 : Télécharger mon E-book / Accéder à la Formation */}
                  <a
                    href={orderData.downloadUrl || '#'}
                    download
                    onClick={() => playValidationBeep()}
                    className="py-3.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-extrabold text-xs flex items-center justify-center gap-2 shadow-md shadow-blue-600/30 transition cursor-pointer active:scale-95"
                  >
                    <Download className="w-4 h-4" />
                    <span>📥 Télécharger mon E-book / Formation</span>
                  </a>

                  {/* Bouton 2 : Ouvrir mon Pass Live / Webinaire */}
                  <a
                    href={`/live/${orderData.liveSessionSlug || orderData.storeSlug || 'webinaire'}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={() => playValidationBeep()}
                    className="py-3.5 px-4 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-extrabold text-xs flex items-center justify-center gap-2 shadow-md transition cursor-pointer active:scale-95"
                  >
                    <Tv className="w-4 h-4" />
                    <span>🎟️ Ouvrir mon Pass pour la Salle Live</span>
                  </a>
                </div>
              </div>

              {/* Bouton secondaire WhatsApp pour le numérique */}
              <a
                href={whatsappOrderUrl}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => playTapBeep()}
                className="w-full bg-[#25D366] hover:bg-[#1ebe5d] text-white font-bold text-xs py-3 px-4 rounded-xl flex items-center justify-center gap-2 transition cursor-pointer shadow-sm"
              >
                <MessageCircle className="w-4 h-4 fill-white" />
                <span>Recevoir mes accès également sur mon WhatsApp</span>
              </a>

            </div>
          )}

          {/* =======================================================================
              3. CARTE DE FACTURE OFFICIELLE (DÉTAIL ARTICLES, TOTAL & QR CODE)
              ======================================================================= */}
          <div className="border border-slate-200 rounded-3xl p-5 sm:p-6 bg-slate-50/60 space-y-4 print:border-none print:bg-white print:p-0">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <div>
                <h4 className="text-xs font-black uppercase tracking-wider text-slate-800">
                  Détail de la Facture
                </h4>
                <span className="text-[11px] text-slate-500">
                  Émise le {orderData.createdAt}
                </span>
              </div>

              {/* Bouton Imprimer / Télécharger Reçu Officiel */}
              <button
                type="button"
                onClick={handlePrint}
                className="px-3.5 py-1.5 rounded-xl bg-white hover:bg-blue-50 border border-blue-200 text-blue-700 font-extrabold text-xs flex items-center gap-1.5 shadow-2xs transition cursor-pointer print:hidden active:scale-95"
                title="Imprimer ou enregistrer en PDF"
              >
                <Printer className="w-3.5 h-3.5 text-blue-600" />
                <span>🧾 Télécharger / Imprimer mon Reçu</span>
              </button>
            </div>

            {/* Tableau des Articles Commandés */}
            <div className="space-y-2">
              {(orderData.items || []).map((item, idx) => (
                <div 
                  key={`${item.name}_${idx}`}
                  className="flex items-center justify-between text-xs py-1.5 border-b border-slate-100 last:border-none"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span className="w-6 h-6 rounded-lg bg-blue-100 text-blue-800 font-bold flex items-center justify-center text-[11px] shrink-0">
                      {item.quantity}x
                    </span>
                    <div className="min-w-0">
                      <p className="font-bold text-slate-900 truncate">
                        {item.name}
                      </p>
                      {(item.color || item.size) && (
                        <p className="text-[10px] text-slate-500">
                          {[item.color, item.size].filter(Boolean).join(' • ')}
                        </p>
                      )}
                    </div>
                  </div>

                  <span className="font-black text-slate-900 shrink-0 font-mono">
                    {formatCFA(item.price * item.quantity)}
                  </span>
                </div>
              ))}
            </div>

            {/* Récapitulatif Total & Mode de Paiement */}
            <div className="pt-2 border-t border-slate-200 space-y-1.5 text-xs">
              <div className="flex items-center justify-between text-slate-600">
                <span>Sous-total articles :</span>
                <span className="font-bold font-mono">{formatCFA(orderData.subtotal)}</span>
              </div>
              <div className="flex items-center justify-between text-slate-600">
                <span>Frais d&apos;expédition :</span>
                <span className="font-bold font-mono">
                  {orderData.deliveryFee ? formatCFA(orderData.deliveryFee) : '0 FCFA (Offert 🚚)'}
                </span>
              </div>
              <div className="flex items-center justify-between text-slate-600">
                <span>Mode de règlement :</span>
                <span className="font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded">
                  {orderData.paymentMethod || 'Paiement à la livraison'}
                </span>
              </div>

              {/* Ligne Totale Pleine Largeur */}
              <div className="pt-2 border-t border-slate-300 flex items-center justify-between text-sm sm:text-base font-black text-slate-900">
                <span>Total à Régler :</span>
                <span className="text-blue-600 font-black font-mono text-base sm:text-lg">
                  {formatCFA(orderData.total)}
                </span>
              </div>
            </div>

            {/* QR Code de Suivi de Commande & Coordonnées Vendeur */}
            <div className="pt-3 border-t border-slate-200 flex items-center justify-between gap-4">
              <div className="space-y-1 text-[11px] text-slate-500">
                <p className="font-bold text-slate-800">
                  {effectiveStoreName}
                </p>
                <p className="flex items-center gap-1">
                  <MapPin className="w-3 h-3 text-blue-600 shrink-0" />
                  <span>{effectiveAddress}</span>
                </p>
                <p className="flex items-center gap-1">
                  <Phone className="w-3 h-3 text-blue-600 shrink-0" />
                  <span>Hotline : {effectivePhone}</span>
                </p>
              </div>

              {/* QR Code Nanasore */}
              <div className="flex flex-col items-center shrink-0">
                <img
                  src={trackingQrUrl}
                  alt="QR Code Suivi"
                  className="w-16 h-16 rounded-xl border border-blue-200 p-0.5 bg-white shadow-2xs"
                />
                <span className="text-[9px] font-black text-blue-600 mt-1 uppercase tracking-tighter">
                  Scannez pour Suivre
                </span>
              </div>
            </div>

          </div>

        </div>

        {/* ========================================================================= */}
        {/* 4. PIED DE PAGE DE LA MODALE */}
        {/* ========================================================================= */}
        <div className="p-4 sm:p-5 bg-slate-50 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs print:hidden">
          <span className="text-slate-500 text-[11px] font-medium flex items-center gap-1">
            <ShieldCheck className="w-3.5 h-3.5 text-blue-600" />
            <span>Garantie Satisfait ou Remboursé • Nanasore™ OS</span>
          </span>

          <button
            type="button"
            onClick={handleClose}
            className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold transition cursor-pointer active:scale-95"
          >
            ← Continuer mes achats sur la boutique
          </button>
        </div>

      </div>
    </div>
  );
};

export default triggerOrderConfirmationVault;
