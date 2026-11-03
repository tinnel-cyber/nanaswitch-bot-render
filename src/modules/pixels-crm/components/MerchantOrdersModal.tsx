import React, { useState, useMemo } from 'react';
import {
  Package,
  X,
  Phone,
  MessageCircle,
  Truck,
  CheckCircle2,
  Clock,
  MapPin,
  Mail,
  User,
  Search,
  ExternalLink,
  ChevronRight,
  Share2,
  Trash2,
  AlertTriangle,
  CreditCard,
  DollarSign
} from 'lucide-react';
import { StoreCustomerOrder, updateCustomerOrderStatus, deleteCustomerOrderEverywhere } from '../../../services/orderSyncService';
import { formatCFA, playTapBeep, playValidationBeep } from '../../../utils/audio';

interface MerchantOrdersModalProps {
  isOpen: boolean;
  onClose: () => void;
  orders: StoreCustomerOrder[];
  storeId: string;
  storeName?: string;
  highlightedOrderId?: string | null;
}

export const MerchantOrdersModal: React.FC<MerchantOrdersModalProps> = ({
  isOpen,
  onClose,
  orders,
  storeId,
  storeName = 'Votre Boutique',
  highlightedOrderId = null
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'NEW' | 'DELIVERING' | 'DELIVERED'>('ALL');
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(highlightedOrderId);
  const [actionSuccessMessage, setActionSuccessMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const showFeedback = (msg: string) => {
    setActionSuccessMessage(msg);
    setTimeout(() => setActionSuccessMessage(null), 3000);
  };

  // Compteurs
  const newCount = orders.filter(
    (o) => !o.deliveryStatus || o.deliveryStatus === 'Nouvelle commande' || o.status === 'EN_ATTENTE'
  ).length;

  const deliveringCount = orders.filter(
    (o) => o.deliveryStatus === 'En cours de livraison' || o.status === 'CONFIRME'
  ).length;

  const deliveredCount = orders.filter(
    (o) => o.deliveryStatus === 'Livrée' || o.status === 'LIVRE' || o.status === 'PAYE'
  ).length;

  // Filtrage
  const filteredOrders = useMemo(() => {
    return orders.filter((order) => {
      // Filtre statut
      const isNew = !order.deliveryStatus || order.deliveryStatus === 'Nouvelle commande' || order.status === 'EN_ATTENTE';
      const isDelivering = order.deliveryStatus === 'En cours de livraison' || order.status === 'CONFIRME';
      const isDelivered = order.deliveryStatus === 'Livrée' || order.status === 'LIVRE' || order.status === 'PAYE';

      if (statusFilter === 'NEW' && !isNew) return false;
      if (statusFilter === 'DELIVERING' && !isDelivering) return false;
      if (statusFilter === 'DELIVERED' && !isDelivered) return false;

      // Filtre recherche
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchName = order.customerName?.toLowerCase().includes(q);
        const matchPhone = order.customerPhone?.toLowerCase().includes(q);
        const matchAddress = (order.deliveryAddress || order.customerAddress || '').toLowerCase().includes(q);
        const matchNumber = order.orderNumber?.toLowerCase().includes(q);
        return matchName || matchPhone || matchAddress || matchNumber;
      }

      return true;
    });
  }, [orders, statusFilter, searchQuery]);

  // Passage en livraison
  const handleSetDelivering = async (order: StoreCustomerOrder) => {
    playValidationBeep();
    await updateCustomerOrderStatus(order.id, storeId, {
      deliveryStatus: 'En cours de livraison',
      status: 'CONFIRME'
    });
    showFeedback(`Commande ${order.orderNumber} passée "En cours de livraison" !`);
  };

  // Passage en livrée
  const handleSetDelivered = async (order: StoreCustomerOrder) => {
    playValidationBeep();
    const isPaid = (order.paymentStatus || '').includes('PAYÉ');
    await updateCustomerOrderStatus(order.id, storeId, {
      deliveryStatus: 'Livrée',
      status: 'LIVRE',
      paymentStatus: isPaid ? order.paymentStatus : 'PAYÉ (Encaissé à la livraison)'
    });
    showFeedback(`Commande ${order.orderNumber} marquée "Livrée ✅" !`);
  };

  // Suppression
  const handleDelete = async (order: StoreCustomerOrder) => {
    if (!window.confirm(`Supprimer définitivement la commande ${order.orderNumber} de ${order.customerName} ?`)) {
      return;
    }
    playTapBeep();
    await deleteCustomerOrderEverywhere(order.id, storeId);
    showFeedback(`Commande ${order.orderNumber} supprimée.`);
  };

  // Nettoyage téléphone pour WhatsApp / Appel
  const cleanPhone = (phone?: string) => {
    if (!phone) return '';
    return phone.replace(/[^0-9]/g, '');
  };

  // Message WhatsApp pour le client
  const getWhatsAppClientUrl = (order: StoreCustomerOrder) => {
    const rawPhone = cleanPhone(order.customerPhone);
    const address = order.deliveryAddress || order.customerAddress || 'votre adresse';
    const amount = order.totalAmount || order.total || 0;
    const isPaid = (order.paymentStatus || '').includes('PAYÉ');

    const message = encodeURIComponent(
      `Bonjour *${order.customerName}* ! 🛍️\n\n` +
      `Votre commande *${order.orderNumber}* passée sur *${storeName}* est bien confirmée !\n\n` +
      `• *Articles :* ${order.items?.map((i) => `${i.quantity}x ${i.name}`).join(', ')}\n` +
      `• *Montant total :* ${formatCFA(amount)}\n` +
      `• *Règlement :* ${isPaid ? '✅ Payé en ligne' : '🚚 À payer à la livraison en espèces'}\n` +
      `• *Adresse de livraison :* ${address}\n\n` +
      `Notre équipe / livreur est en route pour vous livrer au plus vite. Merci pour votre confiance !`
    );

    return `https://wa.me/${rawPhone}?text=${message}`;
  };

  // Message WhatsApp pour le Livreur
  const getWhatsAppCourierUrl = (order: StoreCustomerOrder) => {
    const address = order.deliveryAddress || order.customerAddress || 'Non précisée';
    const amount = order.totalAmount || order.total || 0;
    const isPaid = (order.paymentStatus || '').includes('PAYÉ');

    const message = encodeURIComponent(
      `🛵 *COURSE DE LIVRAISON • ${storeName.toUpperCase()}*\n\n` +
      `📋 *Réf Commande :* ${order.orderNumber}\n` +
      `👤 *Client :* ${order.customerName}\n` +
      `📞 *Téléphone Client :* ${order.customerPhone || 'Non renseigné'}\n` +
      `📍 *Quartier / Adresse :* ${address}\n\n` +
      `📦 *Articles à livrer :*\n` +
      order.items?.map((i) => `  • ${i.quantity}x ${i.name} (${formatCFA(i.unitPrice || (i as any).price || 0)})`).join('\n') +
      `\n\n💰 *MONTANT TOTAL :* ${formatCFA(amount)}\n` +
      `💳 *STATUT ENCAISSEMENT :* ${
        isPaid
          ? '✅ DÉJÀ PAYÉ EN LIGNE (Ne rien réclamer au client)'
          : `⚠️ À ENCAISSER EN ESPÈCES AU CLIENT : ${formatCFA(amount)}`
      }\n\n` +
      `Merci de confirmer la prise en charge et la livraison effectuée !`
    );

    return `https://wa.me/?text=${message}`;
  };

  return (
    <div className="fixed inset-0 z-[100] bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4 animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-4xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Entête de la Modal */}
        <div className="p-4 sm:p-5 border-b border-slate-800 flex items-center justify-between bg-slate-900/90 gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-amber-500 to-rose-500 flex items-center justify-center text-slate-950 font-black shadow-lg">
              <Package className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-black text-white">
                  📦 Commandes & Livraisons Clients
                </h2>
                {newCount > 0 && (
                  <span className="px-2 py-0.5 rounded-full bg-rose-500 text-white text-[11px] font-black animate-pulse">
                    {newCount} nouvelle{newCount > 1 ? 's' : ''}
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-400">
                Suivi en temps réel des commandes passées sur votre Boutique Vitrine
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => {
              playTapBeep();
              onClose();
            }}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
            title="Fermer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Message de succès temporaire */}
        {actionSuccessMessage && (
          <div className="bg-emerald-500/20 border-b border-emerald-500/40 px-4 py-2 text-xs font-bold text-emerald-300 flex items-center gap-2 animate-in fade-in">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{actionSuccessMessage}</span>
          </div>
        )}

        {/* Filtres & Recherche */}
        <div className="p-4 border-b border-slate-800/80 bg-slate-950/40 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          {/* Onglets Filtres */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
            <button
              type="button"
              onClick={() => {
                playTapBeep();
                setStatusFilter('ALL');
              }}
              className={`px-3 py-1.5 rounded-xl text-xs font-black transition cursor-pointer shrink-0 ${
                statusFilter === 'ALL'
                  ? 'bg-amber-500 text-slate-950 shadow-md'
                  : 'bg-slate-800/80 hover:bg-slate-800 text-slate-300'
              }`}
            >
              Toutes ({orders.length})
            </button>

            <button
              type="button"
              onClick={() => {
                playTapBeep();
                setStatusFilter('NEW');
              }}
              className={`px-3 py-1.5 rounded-xl text-xs font-black transition cursor-pointer shrink-0 flex items-center gap-1.5 ${
                statusFilter === 'NEW'
                  ? 'bg-rose-500 text-white shadow-md'
                  : 'bg-slate-800/80 hover:bg-slate-800 text-slate-300'
              }`}
            >
              <span>Nouvelles</span>
              {newCount > 0 && (
                <span className="w-4 h-4 rounded-full bg-white text-rose-600 text-[10px] font-black flex items-center justify-center">
                  {newCount}
                </span>
              )}
            </button>

            <button
              type="button"
              onClick={() => {
                playTapBeep();
                setStatusFilter('DELIVERING');
              }}
              className={`px-3 py-1.5 rounded-xl text-xs font-black transition cursor-pointer shrink-0 ${
                statusFilter === 'DELIVERING'
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'bg-slate-800/80 hover:bg-slate-800 text-slate-300'
              }`}
            >
              En cours ({deliveringCount})
            </button>

            <button
              type="button"
              onClick={() => {
                playTapBeep();
                setStatusFilter('DELIVERED');
              }}
              className={`px-3 py-1.5 rounded-xl text-xs font-black transition cursor-pointer shrink-0 ${
                statusFilter === 'DELIVERED'
                  ? 'bg-emerald-600 text-white shadow-md'
                  : 'bg-slate-800/80 hover:bg-slate-800 text-slate-300'
              }`}
            >
              Livrées ({deliveredCount})
            </button>
          </div>

          {/* Champ de recherche */}
          <div className="relative min-w-[220px]">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Nom, téléphone, quartier..."
              className="w-full pl-8 pr-3 py-1.5 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-400"
            />
          </div>
        </div>

        {/* Liste des commandes */}
        <div className="flex-1 overflow-y-auto p-3 sm:p-5 space-y-4">
          {filteredOrders.length === 0 ? (
            <div className="text-center py-12 px-4 space-y-3">
              <div className="w-16 h-16 rounded-3xl bg-slate-800/60 border border-slate-700 flex items-center justify-center mx-auto text-slate-500">
                <Package className="w-8 h-8" />
              </div>
              <div className="text-sm font-bold text-slate-300">Aucune commande trouvée</div>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                {searchQuery
                  ? 'Aucun résultat ne correspond à votre recherche.'
                  : 'Dès qu’un client commande sur votre vitrine, elle apparaîtra ici avec ses coordonnées de livraison.'}
              </p>
            </div>
          ) : (
            filteredOrders.map((order) => {
              const amount = order.totalAmount || order.total || 0;
              const isPaid = (order.paymentStatus || '').includes('PAYÉ');
              const address = order.deliveryAddress || order.customerAddress || 'Adresse en attente de précision';
              const rawPhone = cleanPhone(order.customerPhone);
              const isDelivered = order.deliveryStatus === 'Livrée' || order.status === 'LIVRE';
              const isDelivering = order.deliveryStatus === 'En cours de livraison' || order.status === 'CONFIRME';

              return (
                <div
                  key={order.id}
                  className={`bg-slate-900/90 border rounded-2xl p-4 sm:p-5 space-y-4 shadow-lg transition-all ${
                    order.id === selectedOrderId
                      ? 'border-amber-400 ring-2 ring-amber-400/20'
                      : isDelivered
                      ? 'border-emerald-500/30'
                      : isDelivering
                      ? 'border-blue-500/40'
                      : 'border-rose-500/50 hover:border-rose-400'
                  }`}
                >
                  {/* Ligne 1 : En-tête de la commande */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-3">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-mono font-black text-sm text-white">
                        {order.orderNumber}
                      </span>
                      <span className="text-[11px] text-slate-400 flex items-center gap-1">
                        <Clock className="w-3 h-3 text-slate-500" />
                        {order.createdAtFormatted || order.date || new Date(order.createdAt).toLocaleString('fr-FR')}
                      </span>
                    </div>

                    {/* Badge Statut Livraison */}
                    <div className="flex items-center gap-2">
                      <span
                        className={`text-xs font-black px-3 py-1 rounded-full border flex items-center gap-1.5 ${
                          isDelivered
                            ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                            : isDelivering
                            ? 'bg-blue-500/10 text-blue-400 border-blue-500/30'
                            : 'bg-rose-500/20 text-rose-300 border-rose-500/40 animate-pulse'
                        }`}
                      >
                        {isDelivered ? (
                          <>
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                            <span>Livrée ✅</span>
                          </>
                        ) : isDelivering ? (
                          <>
                            <Truck className="w-3.5 h-3.5 text-blue-400" />
                            <span>En cours de livraison</span>
                          </>
                        ) : (
                          <>
                            <Package className="w-3.5 h-3.5 text-rose-400" />
                            <span>Nouvelle commande</span>
                          </>
                        )}
                      </span>

                      <button
                        type="button"
                        onClick={() => handleDelete(order)}
                        className="p-1.5 text-slate-500 hover:text-rose-400 hover:bg-slate-800 rounded-lg transition"
                        title="Supprimer la commande"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Ligne 2 : Fiche Client & Livraison */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 bg-slate-950/70 p-3.5 rounded-xl border border-slate-800/80">
                    <div className="space-y-1.5">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-full bg-amber-500/20 text-amber-400 flex items-center justify-center font-black text-xs shrink-0">
                          <User className="w-3.5 h-3.5" />
                        </div>
                        <div>
                          <div className="font-black text-sm text-white">{order.customerName}</div>
                          {order.customerEmail && (
                            <div className="text-[11px] text-slate-400 flex items-center gap-1">
                              <Mail className="w-3 h-3 text-slate-500" />
                              <span>{order.customerEmail}</span>
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 text-xs text-emerald-400 font-bold pl-9">
                        <Phone className="w-3.5 h-3.5 shrink-0" />
                        <span>{order.customerPhone || 'Numéro non renseigné'}</span>
                      </div>
                    </div>

                    <div className="space-y-1 md:border-l md:border-slate-800 md:pl-3.5">
                      <div className="text-[10px] uppercase font-black text-slate-400 tracking-wider">
                        📍 Adresse / Quartier de livraison :
                      </div>
                      <div className="text-xs font-bold text-slate-200 flex items-start gap-1.5">
                        <MapPin className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                        <span>{address}</span>
                      </div>
                    </div>
                  </div>

                  {/* Ligne 3 : Statut du Paiement (Très visible) */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 rounded-xl border bg-slate-950/40">
                    <div>
                      <div className="text-[10px] uppercase font-black text-slate-400 tracking-wider mb-1">
                        Statut du Règlement :
                      </div>
                      {isPaid ? (
                        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-emerald-500/20 border border-emerald-500/50 text-emerald-300 font-black text-xs">
                          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                          <span>✅ PAYÉ ({order.paymentOperator || 'Mobile Money'})</span>
                          {order.transactionId && (
                            <span className="font-mono text-[10px] text-emerald-200 bg-emerald-950/80 px-1.5 py-0.5 rounded border border-emerald-500/30">
                              ID: {order.transactionId}
                            </span>
                          )}
                        </div>
                      ) : (
                        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-amber-500/20 border border-amber-500/50 text-amber-300 font-black text-xs">
                          <Truck className="w-4 h-4 text-amber-400" />
                          <span>🚚 PAIEMENT À LA LIVRAISON — Encaisser {formatCFA(amount)}</span>
                        </div>
                      )}
                    </div>

                    <div className="text-right">
                      <div className="text-[10px] uppercase font-black text-slate-400 tracking-wider">
                        Total Commande :
                      </div>
                      <div className="text-base sm:text-lg font-black text-white font-mono">
                        {formatCFA(amount)}
                      </div>
                    </div>
                  </div>

                  {/* Ligne 4 : Articles commandés */}
                  <div className="space-y-1.5">
                    <div className="text-[11px] font-bold text-slate-400">
                      Articles ({order.items?.length || 0}) :
                    </div>
                    <div className="space-y-1 bg-slate-950/30 p-2.5 rounded-xl border border-slate-800/60">
                      {order.items?.map((item, idx) => (
                        <div
                          key={idx}
                          className="flex items-center justify-between text-xs text-slate-300 py-0.5"
                        >
                          <div className="flex items-center gap-2">
                            <span className="font-mono font-bold text-amber-400">
                              {item.quantity}x
                            </span>
                            <span className="font-medium text-white">{item.name}</span>
                          </div>
                          <span className="font-mono text-slate-400 font-bold">
                            {formatCFA(item.total || (item.unitPrice || 0) * item.quantity)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Ligne 5 : Boutons d'action rapide commerçant */}
                  <div className="pt-2 border-t border-slate-800 flex flex-wrap items-center justify-between gap-2">
                    {/* Groupe Communication */}
                    <div className="flex items-center gap-2 flex-wrap">
                      {/* 📞 Appeler le client */}
                      {rawPhone && (
                        <a
                          href={`tel:${rawPhone}`}
                          onClick={() => playTapBeep()}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-bold text-xs transition active:scale-95 cursor-pointer shadow-sm"
                        >
                          <Phone className="w-3.5 h-3.5 text-emerald-400" />
                          <span>Appeler</span>
                        </a>
                      )}

                      {/* 💬 Contacter sur WhatsApp */}
                      {rawPhone && (
                        <a
                          href={getWhatsAppClientUrl(order)}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={() => playTapBeep()}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-950 hover:bg-emerald-900 border border-emerald-500/40 text-emerald-300 font-bold text-xs transition active:scale-95 cursor-pointer shadow-sm"
                        >
                          <MessageCircle className="w-3.5 h-3.5 text-emerald-400" />
                          <span>WhatsApp Client</span>
                        </a>
                      )}

                      {/* 🛵 Partager au livreur */}
                      <a
                        href={getWhatsAppCourierUrl(order)}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={() => playTapBeep()}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-950 hover:bg-blue-900 border border-blue-500/40 text-blue-300 font-bold text-xs transition active:scale-95 cursor-pointer shadow-sm"
                      >
                        <Share2 className="w-3.5 h-3.5 text-blue-400" />
                        <span>Partager au livreur</span>
                      </a>
                    </div>

                    {/* Groupe Changement de statut */}
                    <div className="flex items-center gap-2 ml-auto">
                      {!isDelivering && !isDelivered && (
                        <button
                          type="button"
                          onClick={() => handleSetDelivering(order)}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-black text-xs transition active:scale-95 cursor-pointer shadow-md"
                        >
                          <Truck className="w-3.5 h-3.5" />
                          <span>🛵 En livraison</span>
                        </button>
                      )}

                      {!isDelivered && (
                        <button
                          type="button"
                          onClick={() => handleSetDelivered(order)}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs transition active:scale-95 cursor-pointer shadow-md"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>✅ Livrée</span>
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};

export default MerchantOrdersModal;
