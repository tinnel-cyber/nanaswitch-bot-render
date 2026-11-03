import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { CheckCircle2, ShieldCheck, Truck, Package, MessageSquare, ArrowRight, Laptop, Download, Share2 } from 'lucide-react';
import { OmniFunnelOrder } from '../../../types/omniFunnel';
import { formatCFA, playTapBeep } from '../../../utils/audio';

interface FunnelSuccessViewProps {
  order: OmniFunnelOrder;
  onGoToClassroom?: (courseId: string) => void;
  onBackToStore?: () => void;
}

export const FunnelSuccessView: React.FC<FunnelSuccessViewProps> = ({
  order,
  onGoToClassroom,
  onBackToStore
}) => {
  return (
    <div className="min-h-screen w-full bg-[#020617] text-slate-100 flex flex-col items-center justify-center p-4 font-sans select-none overflow-y-auto">
      <div className="w-full max-w-xl rounded-3xl bg-slate-900 border border-slate-800 shadow-2xl p-5 sm:p-8 space-y-6 text-center my-6">
        {/* Icône de Réussite */}
        <div className="w-16 h-16 rounded-full bg-emerald-500/20 border-2 border-emerald-500 text-emerald-400 flex items-center justify-center mx-auto shadow-xl shadow-emerald-500/30">
          <CheckCircle2 className="w-8 h-8" />
        </div>

        {/* Titre & Félicitations */}
        <div className="space-y-1">
          <span className="px-3 py-1 rounded-full bg-emerald-500/15 text-emerald-300 text-xs font-black border border-emerald-500/30">
            PAIEMENT CONFIRMÉ & VALIDÉ
          </span>
          <h1 className="text-xl sm:text-2xl font-black text-white pt-2">
            Félicitations {order.customer.fullName} !
          </h1>
          <p className="text-xs sm:text-sm text-slate-300">
            Votre commande <strong className="text-white font-mono">#{order.orderId}</strong> a été enregistrée avec succès.
          </p>
        </div>

        {/* Récapitulatif de la Commande */}
        <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800/80 text-left space-y-3">
          <div className="flex items-center justify-between text-xs font-bold text-slate-400 border-b border-slate-800 pb-2">
            <span>Détail de votre facture</span>
            <span className="font-mono text-emerald-400">{order.payment.provider}</span>
          </div>

          <div className="space-y-2 text-xs">
            <div className="flex items-center justify-between text-white">
              <span>{order.primaryProduct.name}</span>
              <span className="font-mono font-bold">{formatCFA(order.payment.primaryAmount)}</span>
            </div>

            {order.orderBump && order.orderBump.accepted && (
              <div className="flex items-center justify-between text-amber-300">
                <span>{order.orderBump.title}</span>
                <span className="font-mono font-bold">+{formatCFA(order.payment.bumpAmount)}</span>
              </div>
            )}

            {order.delivery && (
              <div className="flex items-center justify-between text-indigo-300">
                <span>{order.delivery.option.name}</span>
                <span className="font-mono font-bold">
                  {order.payment.shippingAmount === 0 ? 'Gratuit' : formatCFA(order.payment.shippingAmount)}
                </span>
              </div>
            )}

            {order.upsell && order.upsell.purchased && (
              <div className="flex items-center justify-between text-emerald-300">
                <span>Offre Spéciale : {order.upsell.title}</span>
                <span className="font-mono font-bold">+{formatCFA(order.payment.upsellAmount)}</span>
              </div>
            )}

            {order.downsell && order.downsell.purchased && (
              <div className="flex items-center justify-between text-emerald-300">
                <span>Option Entretien : {order.downsell.title}</span>
                <span className="font-mono font-bold">+{formatCFA(order.payment.downsellAmount)}</span>
              </div>
            )}
          </div>

          <div className="border-t border-slate-800 pt-2 flex items-center justify-between font-black text-sm">
            <span className="text-white">Total Réglé :</span>
            <span className="text-emerald-400 font-mono text-base">{formatCFA(order.payment.grandTotal)}</span>
          </div>
        </div>

        {/* Encadré Logistique ou Accès Numérique */}
        {order.itemType === 'physical' && order.delivery ? (
          <div className="p-4 rounded-2xl bg-indigo-500/10 border border-indigo-500/30 text-left space-y-2">
            <div className="flex items-center gap-2 text-xs font-black text-indigo-300">
              <Truck className="w-4 h-4 text-indigo-400" />
              <span>EXPÉDITION & LIVRAISON EN COURS</span>
            </div>
            <p className="text-xs text-slate-300">
              Votre colis est confié à notre coursier express pour une livraison estimée : <strong className="text-white">{order.delivery.option.estimatedTime}</strong>.
            </p>
            <p className="text-[11px] text-slate-400">
              Un message de confirmation WhatsApp a été expédié au <strong className="text-white">{order.customer.phoneNumber}</strong>.
            </p>
          </div>
        ) : (
          <div className="p-4 rounded-2xl bg-indigo-500/10 border border-indigo-500/30 text-left space-y-2">
            <div className="flex items-center gap-2 text-xs font-black text-indigo-300">
              <Laptop className="w-4 h-4 text-indigo-400" />
              <span>ACCÈS ACADÉMIE IMMÉDIAT</span>
            </div>
            <p className="text-xs text-slate-300">
              Vos identifiants ont été envoyés par email. Vous pouvez entrer directement dans votre classe virtuelle.
            </p>
          </div>
        )}

        {/* Boutons d'Action Principaux */}
        <div className="space-y-3">
          {order.itemType === 'digital' && order.primaryProduct.courseId ? (
            <button
              type="button"
              onClick={() => {
                playTapBeep();
                if (onGoToClassroom) onGoToClassroom(order.primaryProduct.courseId!);
                else if (typeof window !== 'undefined') {
                  window.history.pushState({}, '', `/classroom/${order.primaryProduct.courseId}`);
                  window.dispatchEvent(new PopStateEvent('popstate'));
                }
              }}
              className="w-full py-4 px-6 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-black text-sm rounded-2xl shadow-xl flex items-center justify-center gap-2 cursor-pointer transition"
            >
              <Laptop className="w-4 h-4" />
              <span>Accéder au Campus Virtuel</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          ) : (
            <button
              type="button"
              onClick={() => {
                playTapBeep();
                const msg = encodeURIComponent(`Bonjour, je souhaite suivre ma commande #${order.orderId} passée par ${order.customer.fullName}.`);
                window.open(`https://wa.me/22670000000?text=${msg}`, '_blank');
              }}
              className="w-full py-4 px-6 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-black text-sm rounded-2xl shadow-xl flex items-center justify-center gap-2 cursor-pointer transition"
            >
              <MessageSquare className="w-4 h-4" />
              <span>Suivre mon colis sur WhatsApp</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          )}

          {onBackToStore && (
            <button
              type="button"
              onClick={() => { playTapBeep(); onBackToStore(); }}
              className="text-xs text-slate-400 hover:text-white cursor-pointer transition block mx-auto"
            >
              Retour à la boutique
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default FunnelSuccessView;
