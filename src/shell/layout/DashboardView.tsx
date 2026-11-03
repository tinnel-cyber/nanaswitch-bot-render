// @ts-nocheck
import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { jsx, jsxs, Fragment } from 'react/jsx-runtime';
import * as LucideIcons from 'lucide-react';
import { db, auth } from '../../firebase';
import { 
  doc, getDoc, setDoc, collection, getDocs, onSnapshot, updateDoc, serverTimestamp 
} from 'firebase/firestore';
import { useTheme } from '../../context/ThemeContext';
import { getSafeStoreSlug, ensureMandatoryStoreSlug } from '../../utils/slugEngine';
import { 
  formatCFA, playTapBeep, playValidationBeep, playCancelSound, playNewOrderAlert 
} from '../../utils/audio';
import { 
  getStoreOrdersLocal, 
  startOrderRealtimeSync, 
  saveCustomerOrderEverywhere 
} from '../../services/orderSyncService';
import { persistInventoryProduct, persistCustomerOrder } from '../../utils/firestoreService';
import { saveFunnelConfig } from '../../services/omniFunnelService';
import { saveTenantCustomDomain } from '../../services/tenantDomainService';
import { buildPublicShopUrl } from '../../config/domains';
import { getThemeRoutePrefix } from '../../utils/themeRoutePrefix';
import { ensureAndPersistTenantSlug } from '../../utils/slugService';
import { getCompletedTutorialIds, toggleTutorialCompleted } from '../../services/tutorialService';
import { LiveOrderNotificationBanner } from '../../components/LiveOrderNotificationBanner';
import { MiniVideoPlayer } from '../../components/common/MiniVideoPlayer';
import { NanaAcademyDrawer } from '../../apps/cours-forge/components/NanaAcademyDrawer';
import { 
  getEffectiveSellerPaymentConfig, 
  SPaymentGateway as SebpayPaymentGateway 
} from '../../components/payment/SPaymentGateway';
import { UltimateCheckout } from '../../components/payment/UltimateCheckout';
import { KycVerificationModal } from '../../components/storeBuilder/KycVerificationModal';
import { AddProductModal } from '../../components/storeBuilder/AddProductModal';
import { TickerEditModal } from '../../components/storeBuilder/TickerEditModal';
import { ProductDetailModal } from '../../components/storeBuilder/ProductDetailModal';
import { FunnelBuilder } from '../../components/storeBuilder/FunnelBuilder';
import { MerchantFlashAlert } from '../../components/flashLive/MerchantFlashAlert';
import { CreateWebinarModal } from '../../apps/webinar/components/CreateWebinarModal';
import { getStoreKycRequest } from '../../utils/kycService';
import { isSuperAdminLocally } from '../../services/superAdminService';
import { RichTextEditor, ProductRichDescription } from '../../components/storeBuilder/RichTextEditor';
import { 
  extractCleanPixelId, 
  initFacebookPixel, 
  initTikTokPixel, 
  trackPixelConversion 
} from '../../utils/pixelTracking';

// React and JSX runtime aliases used by compiled bundle
const r = React;
const e = { jsx, jsxs, Fragment };
const us = React;
const ra = (loader: any) => (typeof loader === 'function' ? loader() : Promise.resolve(loader));

// Firebase Firestore bindings
const ne = doc;
const ve = setDoc;
const Kt = updateDoc;
const ft = serverTimestamp;
const wa = collection;
const va = onSnapshot;
const Qt = getDoc;

// Utility and Service bindings from index
const u = playTapBeep;
const z = formatCFA;
const na = async (orderId: string, storeId: string) => {
  try {
    const ref = doc(db, 'stores', storeId, 'orders', orderId);
    await updateDoc(ref, { status: 'DELETED', isDeleted: true });
  } catch (err) {
    console.warn('[DashboardView] deleteOrder error:', err);
  }
};
const oe = playValidationBeep;
const Jt = async (orderId: string, storeId: string, updates: any) => {
  try {
    const ref = doc(db, 'stores', storeId, 'orders', orderId);
    await updateDoc(ref, updates);
  } catch (err) {
    console.warn('[DashboardView] updateOrder error:', err);
  }
};
const re = auth;
const playOrderAlertSound = playNewOrderAlert;
const oa = getSafeStoreSlug;
const ia = useTheme;
const Yt = getCompletedTutorialIds;
const la = getStoreOrdersLocal;
const ca = startOrderRealtimeSync;
const ee = saveCustomerOrderEverywhere;
const da = saveFunnelConfig;
const ma = NanaAcademyDrawer;
const pt = ensureMandatoryStoreSlug;
const ua = LiveOrderNotificationBanner;
const xa = NanaAcademyDrawer;
const ha = MiniVideoPlayer;
const pa = toggleTutorialCompleted;
const fa = playCancelSound;
const ba = saveTenantCustomDomain;
const Ht = persistInventoryProduct;
const ga = persistCustomerOrder;

// Component & Modal bindings
const Ta = getEffectiveSellerPaymentConfig;
const ls = UltimateCheckout;
const Ra = KycVerificationModal;
const La = AddProductModal;
const Oa = TickerEditModal;
const qa = ProductDetailModal;
const Da = initFacebookPixel;
const $a = initTikTokPixel;
const cs = trackPixelConversion;
const ds = extractCleanPixelId;
const Fa = FunnelBuilder;
const Ba = MerchantFlashAlert;
const Va = CreateWebinarModal;
const Ua = getStoreKycRequest;
const Qe = RichTextEditor;
const ms = ProductRichDescription;

// Lucide Icons bindings
const Te = LucideIcons.Package;
const Re = LucideIcons.X;
const ue = LucideIcons.CheckCircle2 || LucideIcons.Check;
const Na = LucideIcons.Search;
const ya = LucideIcons.Clock;
const bt = LucideIcons.Truck;
const xs = LucideIcons.Trash2;
const ja = LucideIcons.User;
const Sa = LucideIcons.Mail;
const Xt = LucideIcons.Phone;
const ka = LucideIcons.MapPin;
const hs = LucideIcons.MessageCircle;
const vt = LucideIcons.Share2;
const Xe = LucideIcons.Zap;
const ps = LucideIcons.Sparkles;
const Nt = LucideIcons.Palette;
const fs = LucideIcons.Check;
const Zt = LucideIcons.ArrowLeft;
const Ne = LucideIcons.ShieldCheck;
const es = LucideIcons.Settings;
const ts = LucideIcons.Globe;
const Ca = LucideIcons.Wallet;
const gt = LucideIcons.ShoppingBag;
const Pa = LucideIcons.Coins;
const ss = LucideIcons.Plus;
const as = LucideIcons.Edit3 || LucideIcons.PenTool;
const rs = LucideIcons.Copy;
const Ia = LucideIcons.ExternalLink;
const Aa = LucideIcons.Store;
const Ea = LucideIcons.Camera;
const ns = LucideIcons.Sun;
const os = LucideIcons.Droplets;
const is = LucideIcons.Moon;
const _e = LucideIcons.Lock;
const _a = LucideIcons.QrCode;
const Ma = LucideIcons.ArrowUp;

const Wa = ({
    isOpen: x,
    onClose: h,
    orders: w,
    storeId: c,
    storeName: E = "Votre Boutique",
    highlightedOrderId: V = null,
  }) => {
    const [y, O] = r.useState(""),
      [k, A] = r.useState("ALL"),
      [U, _] = r.useState(V),
      [S, G] = r.useState(null);
    if (!x) return null;
    const D = (i) => {
        (G(i), setTimeout(() => G(null), 3e3));
      },
      X = w.filter(
        (i) =>
          !i.deliveryStatus ||
          i.deliveryStatus === "Nouvelle commande" ||
          i.status === "EN_ATTENTE",
      ).length,
      J = w.filter(
        (i) =>
          i.deliveryStatus === "En cours de livraison" ||
          i.status === "CONFIRME",
      ).length,
      ye = w.filter(
        (i) =>
          i.deliveryStatus === "Livrée" ||
          i.status === "LIVRE" ||
          i.status === "PAYE",
      ).length,
      ie = r.useMemo(
        () =>
          w.filter((i) => {
            const M =
                !i.deliveryStatus ||
                i.deliveryStatus === "Nouvelle commande" ||
                i.status === "EN_ATTENTE",
              Y =
                i.deliveryStatus === "En cours de livraison" ||
                i.status === "CONFIRME",
              te =
                i.deliveryStatus === "Livrée" ||
                i.status === "LIVRE" ||
                i.status === "PAYE";
            if (
              (k === "NEW" && !M) ||
              (k === "DELIVERING" && !Y) ||
              (k === "DELIVERED" && !te)
            )
              return !1;
            if (y.trim()) {
              const $ = y.toLowerCase(),
                P = i.customerName?.toLowerCase().includes($),
                H = i.customerPhone?.toLowerCase().includes($),
                K = (i.deliveryAddress || i.customerAddress || "")
                  .toLowerCase()
                  .includes($),
                xe = i.orderNumber?.toLowerCase().includes($);
              return P || H || K || xe;
            }
            return !0;
          }),
        [w, k, y],
      ),
      je = async (i) => {
        (oe(),
          await Jt(i.id, c, {
            deliveryStatus: "En cours de livraison",
            status: "CONFIRME",
          }),
          D(`Commande ${i.orderNumber} passée "En cours de livraison" !`));
      },
      Se = async (i) => {
        oe();
        const M = (i.paymentStatus || "").includes("PAYÉ");
        (await Jt(i.id, c, {
          deliveryStatus: "Livrée",
          status: "LIVRE",
          paymentStatus: M ? i.paymentStatus : "PAYÉ (Encaissé à la livraison)",
        }),
          D(`Commande ${i.orderNumber} marquée "Livrée ✅" !`));
      },
      v = async (i) => {
        window.confirm(
          `Supprimer définitivement la commande ${i.orderNumber} de ${i.customerName} ?`,
        ) &&
          (u(), await na(i.id, c), D(`Commande ${i.orderNumber} supprimée.`));
      },
      l = (i) => (i ? i.replace(/[^0-9]/g, "") : ""),
      n = (i) => {
        const M = l(i.customerPhone),
          Y = i.deliveryAddress || i.customerAddress || "votre adresse",
          te = i.totalAmount || i.total || 0,
          $ = (i.paymentStatus || "").includes("PAYÉ"),
          P = encodeURIComponent(`Bonjour *${i.customerName}* ! 🛍️

Votre commande *${i.orderNumber}* passée sur *${E}* est bien confirmée !

• *Articles :* ${i.items?.map((H) => `${H.quantity}x ${H.name}`).join(", ")}
• *Montant total :* ${z(te)}
• *Règlement :* ${$ ? "✅ Payé en ligne" : "🚚 À payer à la livraison en espèces"}
• *Adresse de livraison :* ${Y}

Notre équipe / livreur est en route pour vous livrer au plus vite. Merci pour votre confiance !`);
        return `https://wa.me/${M}?text=${P}`;
      },
      j = (i) => {
        const M = i.deliveryAddress || i.customerAddress || "Non précisée",
          Y = i.totalAmount || i.total || 0,
          te = (i.paymentStatus || "").includes("PAYÉ");
        return `https://wa.me/?text=${encodeURIComponent(
          `🛵 *COURSE DE LIVRAISON • ${E.toUpperCase()}*

📋 *Réf Commande :* ${i.orderNumber}
👤 *Client :* ${i.customerName}
📞 *Téléphone Client :* ${i.customerPhone || "Non renseigné"}
📍 *Quartier / Adresse :* ${M}

📦 *Articles à livrer :*
` +
            i.items?.map(
              (P) =>
                `  • ${P.quantity}x ${P.name} (${z(P.unitPrice || P.price || 0)})`,
            ).join(`
`) +
            `

💰 *MONTANT TOTAL :* ${z(Y)}
💳 *STATUT ENCAISSEMENT :* ${te ? "✅ DÉJÀ PAYÉ EN LIGNE (Ne rien réclamer au client)" : `⚠️ À ENCAISSER EN ESPÈCES AU CLIENT : ${z(Y)}`}

Merci de confirmer la prise en charge et la livraison effectuée !`,
        )}`;
      };
    return e.jsx("div", {
      className:
        "fixed inset-0 z-[100] bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4 animate-in fade-in duration-200",
      children: e.jsxs("div", {
        className:
          "bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-4xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden",
        children: [
          e.jsxs("div", {
            className:
              "p-4 sm:p-5 border-b border-slate-800 flex items-center justify-between bg-slate-900/90 gap-3",
            children: [
              e.jsxs("div", {
                className: "flex items-center gap-3",
                children: [
                  e.jsx("div", {
                    className:
                      "w-10 h-10 rounded-2xl bg-gradient-to-tr from-amber-500 to-rose-500 flex items-center justify-center text-slate-950 font-black shadow-lg",
                    children: e.jsx(Te, { className: "w-5 h-5 text-white" }),
                  }),
                  e.jsxs("div", {
                    children: [
                      e.jsxs("div", {
                        className: "flex items-center gap-2",
                        children: [
                          e.jsx("h2", {
                            className:
                              "text-base sm:text-lg font-black text-white",
                            children: "📦 Commandes & Livraisons Clients",
                          }),
                          X > 0 &&
                            e.jsxs("span", {
                              className:
                                "px-2 py-0.5 rounded-full bg-rose-500 text-white text-[11px] font-black animate-pulse",
                              children: [X, " nouvelle", X > 1 ? "s" : ""],
                            }),
                        ],
                      }),
                      e.jsx("p", {
                        className: "text-xs text-slate-400",
                        children:
                          "Suivi en temps réel des commandes passées sur votre Boutique Vitrine",
                      }),
                    ],
                  }),
                ],
              }),
              e.jsx("button", {
                type: "button",
                onClick: () => {
                  (u(), h());
                },
                className:
                  "p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer",
                title: "Fermer",
                children: e.jsx(Re, { className: "w-5 h-5" }),
              }),
            ],
          }),
          S &&
            e.jsxs("div", {
              className:
                "bg-emerald-500/20 border-b border-emerald-500/40 px-4 py-2 text-xs font-bold text-emerald-300 flex items-center gap-2 animate-in fade-in",
              children: [
                e.jsx(ue, { className: "w-4 h-4 text-emerald-400 shrink-0" }),
                e.jsx("span", { children: S }),
              ],
            }),
          e.jsxs("div", {
            className:
              "p-4 border-b border-slate-800/80 bg-slate-950/40 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3",
            children: [
              e.jsxs("div", {
                className:
                  "flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none",
                children: [
                  e.jsxs("button", {
                    type: "button",
                    onClick: () => {
                      (u(), A("ALL"));
                    },
                    className: `px-3 py-1.5 rounded-xl text-xs font-black transition cursor-pointer shrink-0 ${k === "ALL" ? "bg-amber-500 text-slate-950 shadow-md" : "bg-slate-800/80 hover:bg-slate-800 text-slate-300"}`,
                    children: ["Toutes (", w.length, ")"],
                  }),
                  e.jsxs("button", {
                    type: "button",
                    onClick: () => {
                      (u(), A("NEW"));
                    },
                    className: `px-3 py-1.5 rounded-xl text-xs font-black transition cursor-pointer shrink-0 flex items-center gap-1.5 ${k === "NEW" ? "bg-rose-500 text-white shadow-md" : "bg-slate-800/80 hover:bg-slate-800 text-slate-300"}`,
                    children: [
                      e.jsx("span", { children: "Nouvelles" }),
                      X > 0 &&
                        e.jsx("span", {
                          className:
                            "w-4 h-4 rounded-full bg-white text-rose-600 text-[10px] font-black flex items-center justify-center",
                          children: X,
                        }),
                    ],
                  }),
                  e.jsxs("button", {
                    type: "button",
                    onClick: () => {
                      (u(), A("DELIVERING"));
                    },
                    className: `px-3 py-1.5 rounded-xl text-xs font-black transition cursor-pointer shrink-0 ${k === "DELIVERING" ? "bg-blue-600 text-white shadow-md" : "bg-slate-800/80 hover:bg-slate-800 text-slate-300"}`,
                    children: ["En cours (", J, ")"],
                  }),
                  e.jsxs("button", {
                    type: "button",
                    onClick: () => {
                      (u(), A("DELIVERED"));
                    },
                    className: `px-3 py-1.5 rounded-xl text-xs font-black transition cursor-pointer shrink-0 ${k === "DELIVERED" ? "bg-emerald-600 text-white shadow-md" : "bg-slate-800/80 hover:bg-slate-800 text-slate-300"}`,
                    children: ["Livrées (", ye, ")"],
                  }),
                ],
              }),
              e.jsxs("div", {
                className: "relative min-w-[220px]",
                children: [
                  e.jsx(Na, {
                    className:
                      "w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2",
                  }),
                  e.jsx("input", {
                    type: "text",
                    value: y,
                    onChange: (i) => O(i.target.value),
                    placeholder: "Nom, téléphone, quartier...",
                    className:
                      "w-full pl-8 pr-3 py-1.5 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-400",
                  }),
                ],
              }),
            ],
          }),
          e.jsx("div", {
            className: "flex-1 overflow-y-auto p-3 sm:p-5 space-y-4",
            children:
              ie.length === 0
                ? e.jsxs("div", {
                    className: "text-center py-12 px-4 space-y-3",
                    children: [
                      e.jsx("div", {
                        className:
                          "w-16 h-16 rounded-3xl bg-slate-800/60 border border-slate-700 flex items-center justify-center mx-auto text-slate-500",
                        children: e.jsx(Te, { className: "w-8 h-8" }),
                      }),
                      e.jsx("div", {
                        className: "text-sm font-bold text-slate-300",
                        children: "Aucune commande trouvée",
                      }),
                      e.jsx("p", {
                        className: "text-xs text-slate-500 max-w-sm mx-auto",
                        children: y
                          ? "Aucun résultat ne correspond à votre recherche."
                          : "Dès qu’un client commande sur votre vitrine, elle apparaîtra ici avec ses coordonnées de livraison.",
                      }),
                    ],
                  })
                : ie.map((i) => {
                    const M = i.totalAmount || i.total || 0,
                      Y = (i.paymentStatus || "").includes("PAYÉ"),
                      te =
                        i.deliveryAddress ||
                        i.customerAddress ||
                        "Adresse en attente de précision",
                      $ = l(i.customerPhone),
                      P = i.deliveryStatus === "Livrée" || i.status === "LIVRE",
                      H =
                        i.deliveryStatus === "En cours de livraison" ||
                        i.status === "CONFIRME";
                    return e.jsxs(
                      "div",
                      {
                        className: `bg-slate-900/90 border rounded-2xl p-4 sm:p-5 space-y-4 shadow-lg transition-all ${i.id === U ? "border-amber-400 ring-2 ring-amber-400/20" : P ? "border-emerald-500/30" : H ? "border-blue-500/40" : "border-rose-500/50 hover:border-rose-400"}`,
                        children: [
                          e.jsxs("div", {
                            className:
                              "flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-3",
                            children: [
                              e.jsxs("div", {
                                className: "flex items-center gap-2 flex-wrap",
                                children: [
                                  e.jsx("span", {
                                    className:
                                      "font-mono font-black text-sm text-white",
                                    children: i.orderNumber,
                                  }),
                                  e.jsxs("span", {
                                    className:
                                      "text-[11px] text-slate-400 flex items-center gap-1",
                                    children: [
                                      e.jsx(ya, {
                                        className: "w-3 h-3 text-slate-500",
                                      }),
                                      i.createdAtFormatted ||
                                        i.date ||
                                        new Date(i.createdAt).toLocaleString(
                                          "fr-FR",
                                        ),
                                    ],
                                  }),
                                ],
                              }),
                              e.jsxs("div", {
                                className: "flex items-center gap-2",
                                children: [
                                  e.jsx("span", {
                                    className: `text-xs font-black px-3 py-1 rounded-full border flex items-center gap-1.5 ${P ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30" : H ? "bg-blue-500/10 text-blue-400 border-blue-500/30" : "bg-rose-500/20 text-rose-300 border-rose-500/40 animate-pulse"}`,
                                    children: P
                                      ? e.jsxs(e.Fragment, {
                                          children: [
                                            e.jsx(ue, {
                                              className:
                                                "w-3.5 h-3.5 text-emerald-400",
                                            }),
                                            e.jsx("span", {
                                              children: "Livrée ✅",
                                            }),
                                          ],
                                        })
                                      : H
                                        ? e.jsxs(e.Fragment, {
                                            children: [
                                              e.jsx(bt, {
                                                className:
                                                  "w-3.5 h-3.5 text-blue-400",
                                              }),
                                              e.jsx("span", {
                                                children:
                                                  "En cours de livraison",
                                              }),
                                            ],
                                          })
                                        : e.jsxs(e.Fragment, {
                                            children: [
                                              e.jsx(Te, {
                                                className:
                                                  "w-3.5 h-3.5 text-rose-400",
                                              }),
                                              e.jsx("span", {
                                                children: "Nouvelle commande",
                                              }),
                                            ],
                                          }),
                                  }),
                                  e.jsx("button", {
                                    type: "button",
                                    onClick: () => v(i),
                                    className:
                                      "p-1.5 text-slate-500 hover:text-rose-400 hover:bg-slate-800 rounded-lg transition",
                                    title: "Supprimer la commande",
                                    children: e.jsx(xs, {
                                      className: "w-3.5 h-3.5",
                                    }),
                                  }),
                                ],
                              }),
                            ],
                          }),
                          e.jsxs("div", {
                            className:
                              "grid grid-cols-1 md:grid-cols-2 gap-3 bg-slate-950/70 p-3.5 rounded-xl border border-slate-800/80",
                            children: [
                              e.jsxs("div", {
                                className: "space-y-1.5",
                                children: [
                                  e.jsxs("div", {
                                    className: "flex items-center gap-2",
                                    children: [
                                      e.jsx("div", {
                                        className:
                                          "w-7 h-7 rounded-full bg-amber-500/20 text-amber-400 flex items-center justify-center font-black text-xs shrink-0",
                                        children: e.jsx(ja, {
                                          className: "w-3.5 h-3.5",
                                        }),
                                      }),
                                      e.jsxs("div", {
                                        children: [
                                          e.jsx("div", {
                                            className:
                                              "font-black text-sm text-white",
                                            children: i.customerName,
                                          }),
                                          i.customerEmail &&
                                            e.jsxs("div", {
                                              className:
                                                "text-[11px] text-slate-400 flex items-center gap-1",
                                              children: [
                                                e.jsx(Sa, {
                                                  className:
                                                    "w-3 h-3 text-slate-500",
                                                }),
                                                e.jsx("span", {
                                                  children: i.customerEmail,
                                                }),
                                              ],
                                            }),
                                        ],
                                      }),
                                    ],
                                  }),
                                  e.jsxs("div", {
                                    className:
                                      "flex items-center gap-1.5 text-xs text-emerald-400 font-bold pl-9",
                                    children: [
                                      e.jsx(Xt, {
                                        className: "w-3.5 h-3.5 shrink-0",
                                      }),
                                      e.jsx("span", {
                                        children:
                                          i.customerPhone ||
                                          "Numéro non renseigné",
                                      }),
                                    ],
                                  }),
                                ],
                              }),
                              e.jsxs("div", {
                                className:
                                  "space-y-1 md:border-l md:border-slate-800 md:pl-3.5",
                                children: [
                                  e.jsx("div", {
                                    className:
                                      "text-[10px] uppercase font-black text-slate-400 tracking-wider",
                                    children:
                                      "📍 Adresse / Quartier de livraison :",
                                  }),
                                  e.jsxs("div", {
                                    className:
                                      "text-xs font-bold text-slate-200 flex items-start gap-1.5",
                                    children: [
                                      e.jsx(ka, {
                                        className:
                                          "w-4 h-4 text-rose-400 shrink-0 mt-0.5",
                                      }),
                                      e.jsx("span", { children: te }),
                                    ],
                                  }),
                                ],
                              }),
                            ],
                          }),
                          e.jsxs("div", {
                            className:
                              "flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 rounded-xl border bg-slate-950/40",
                            children: [
                              e.jsxs("div", {
                                children: [
                                  e.jsx("div", {
                                    className:
                                      "text-[10px] uppercase font-black text-slate-400 tracking-wider mb-1",
                                    children: "Statut du Règlement :",
                                  }),
                                  Y
                                    ? e.jsxs("div", {
                                        className:
                                          "inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-emerald-500/20 border border-emerald-500/50 text-emerald-300 font-black text-xs",
                                        children: [
                                          e.jsx(ue, {
                                            className:
                                              "w-4 h-4 text-emerald-400",
                                          }),
                                          e.jsxs("span", {
                                            children: [
                                              "✅ PAYÉ (",
                                              i.paymentOperator ||
                                                "Mobile Money",
                                              ")",
                                            ],
                                          }),
                                          i.transactionId &&
                                            e.jsxs("span", {
                                              className:
                                                "font-mono text-[10px] text-emerald-200 bg-emerald-950/80 px-1.5 py-0.5 rounded border border-emerald-500/30",
                                              children: [
                                                "ID: ",
                                                i.transactionId,
                                              ],
                                            }),
                                        ],
                                      })
                                    : e.jsxs("div", {
                                        className:
                                          "inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-amber-500/20 border border-amber-500/50 text-amber-300 font-black text-xs",
                                        children: [
                                          e.jsx(bt, {
                                            className: "w-4 h-4 text-amber-400",
                                          }),
                                          e.jsxs("span", {
                                            children: [
                                              "🚚 PAIEMENT À LA LIVRAISON — Encaisser ",
                                              z(M),
                                            ],
                                          }),
                                        ],
                                      }),
                                ],
                              }),
                              e.jsxs("div", {
                                className: "text-right",
                                children: [
                                  e.jsx("div", {
                                    className:
                                      "text-[10px] uppercase font-black text-slate-400 tracking-wider",
                                    children: "Total Commande :",
                                  }),
                                  e.jsx("div", {
                                    className:
                                      "text-base sm:text-lg font-black text-white font-mono",
                                    children: z(M),
                                  }),
                                ],
                              }),
                            ],
                          }),
                          e.jsxs("div", {
                            className: "space-y-1.5",
                            children: [
                              e.jsxs("div", {
                                className:
                                  "text-[11px] font-bold text-slate-400",
                                children: [
                                  "Articles (",
                                  i.items?.length || 0,
                                  ") :",
                                ],
                              }),
                              e.jsx("div", {
                                className:
                                  "space-y-1 bg-slate-950/30 p-2.5 rounded-xl border border-slate-800/60",
                                children: i.items?.map((K, xe) =>
                                  e.jsxs(
                                    "div",
                                    {
                                      className:
                                        "flex items-center justify-between text-xs text-slate-300 py-0.5",
                                      children: [
                                        e.jsxs("div", {
                                          className: "flex items-center gap-2",
                                          children: [
                                            e.jsxs("span", {
                                              className:
                                                "font-mono font-bold text-amber-400",
                                              children: [K.quantity, "x"],
                                            }),
                                            e.jsx("span", {
                                              className:
                                                "font-medium text-white",
                                              children: K.name,
                                            }),
                                          ],
                                        }),
                                        e.jsx("span", {
                                          className:
                                            "font-mono text-slate-400 font-bold",
                                          children: z(
                                            K.total ||
                                              (K.unitPrice || 0) * K.quantity,
                                          ),
                                        }),
                                      ],
                                    },
                                    xe,
                                  ),
                                ),
                              }),
                            ],
                          }),
                          e.jsxs("div", {
                            className:
                              "pt-2 border-t border-slate-800 flex flex-wrap items-center justify-between gap-2",
                            children: [
                              e.jsxs("div", {
                                className: "flex items-center gap-2 flex-wrap",
                                children: [
                                  $ &&
                                    e.jsxs("a", {
                                      href: `tel:${$}`,
                                      onClick: () => u(),
                                      className:
                                        "flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-bold text-xs transition active:scale-95 cursor-pointer shadow-sm",
                                      children: [
                                        e.jsx(Xt, {
                                          className:
                                            "w-3.5 h-3.5 text-emerald-400",
                                        }),
                                        e.jsx("span", { children: "Appeler" }),
                                      ],
                                    }),
                                  $ &&
                                    e.jsxs("a", {
                                      href: n(i),
                                      target: "_blank",
                                      rel: "noopener noreferrer",
                                      onClick: () => u(),
                                      className:
                                        "flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-950 hover:bg-emerald-900 border border-emerald-500/40 text-emerald-300 font-bold text-xs transition active:scale-95 cursor-pointer shadow-sm",
                                      children: [
                                        e.jsx(hs, {
                                          className:
                                            "w-3.5 h-3.5 text-emerald-400",
                                        }),
                                        e.jsx("span", {
                                          children: "WhatsApp Client",
                                        }),
                                      ],
                                    }),
                                  e.jsxs("a", {
                                    href: j(i),
                                    target: "_blank",
                                    rel: "noopener noreferrer",
                                    onClick: () => u(),
                                    className:
                                      "flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-950 hover:bg-blue-900 border border-blue-500/40 text-blue-300 font-bold text-xs transition active:scale-95 cursor-pointer shadow-sm",
                                    children: [
                                      e.jsx(vt, {
                                        className: "w-3.5 h-3.5 text-blue-400",
                                      }),
                                      e.jsx("span", {
                                        children: "Partager au livreur",
                                      }),
                                    ],
                                  }),
                                ],
                              }),
                              e.jsxs("div", {
                                className: "flex items-center gap-2 ml-auto",
                                children: [
                                  !H &&
                                    !P &&
                                    e.jsxs("button", {
                                      type: "button",
                                      onClick: () => je(i),
                                      className:
                                        "flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-black text-xs transition active:scale-95 cursor-pointer shadow-md",
                                      children: [
                                        e.jsx(bt, { className: "w-3.5 h-3.5" }),
                                        e.jsx("span", {
                                          children: "🛵 En livraison",
                                        }),
                                      ],
                                    }),
                                  !P &&
                                    e.jsxs("button", {
                                      type: "button",
                                      onClick: () => Se(i),
                                      className:
                                        "flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs transition active:scale-95 cursor-pointer shadow-md",
                                      children: [
                                        e.jsx(ue, { className: "w-3.5 h-3.5" }),
                                        e.jsx("span", {
                                          children: "✅ Livrée",
                                        }),
                                      ],
                                    }),
                                ],
                              }),
                            ],
                          }),
                        ],
                      },
                      i.id,
                    );
                  }),
          }),
        ],
      }),
    });
  },
  za = [
    {
      id: "amber",
      name: "Ambre & Orange",
      class: "from-amber-600 via-orange-600 to-amber-600",
      icon: "🔥",
    },
    {
      id: "emerald",
      name: "Émeraude & Vert",
      class: "from-emerald-600 via-teal-600 to-emerald-600",
      icon: "🌿",
    },
    {
      id: "indigo",
      name: "Indigo & Violet",
      class: "from-indigo-600 via-purple-600 to-indigo-600",
      icon: "💎",
    },
    {
      id: "gold",
      name: "Noir & Or Luxe",
      class: "from-slate-900 via-amber-700 to-slate-900",
      icon: "✨",
    },
    {
      id: "rose",
      name: "Rubis & Framboise",
      class: "from-rose-600 via-pink-600 to-rose-600",
      icon: "🎯",
    },
  ],
  Ga = [
    "💳 Paiement Wave",
    "🟠 Orange Money",
    "💵 Espèces à la livraison",
    "🚚 Livraison en 30 min",
    "⚡ Promo Flash",
    "✨ Nouveautés en stock",
    "📞 Commande 1-Clic WhatsApp",
    "🛡️ Fraîcheur 100% garantie",
  ],
  Ja = [
    {
      title: "Moyens de Paiement & Livraison",
      text: "💳 PAIEMENT À LA RÉCEPTION : WAVE, ORANGE MONEY OU ESPÈCES • 🚚 LIVRAISON EXPRESS EN 30 MIN À DOMICILE & BUREAU • 📲 COMMANDEZ EN 1 CLIC SUR WHATSAPP",
    },
    {
      title: "Offre Spéciale & Promotions",
      text: "⚡ PROMO FLASH : LIVRAISON OFFERTE DÈS 10 000 F CFA ! • 🏷️ REMISES SPÉCIALES SUR LES NOUVEAUTÉS • 💳 PAIEMENT SÉCURISÉ WAVE & ORANGE MONEY",
    },
    {
      title: "Produits Frais & Disponibilité",
      text: "✨ ARRIVAGE DU JOUR EN STOCK • 🛡️ QUALITÉ & FRAÎCHEUR GARANTIES • 💳 RÈGLEMENT PAR WAVE, ORANGE MONEY OU CASH • COMMANDE 7J/7",
    },
  ],
  Ya = ({
    isOpen: x,
    onClose: h,
    currentText: w,
    initialText: c,
    currentGradient: E,
    initialBgGradient: V,
    isVisible: y,
    initialShowTicker: O,
    onSave: k,
  }) => {
    const A = c ?? w ?? "",
      U = V ?? E ?? "from-amber-600 via-orange-600 to-amber-600",
      _ = O ?? y ?? !0,
      [S, G] = r.useState(A),
      [D, X] = r.useState(U),
      [J, ye] = r.useState(_);
    if (
      (r.useEffect(() => {
        x &&
          (G(c ?? w ?? ""),
          X(V ?? E ?? "from-amber-600 via-orange-600 to-amber-600"),
          ye(O ?? y ?? !0));
      }, [x, c, w, V, E, O, y]),
      !x)
    )
      return null;
    const ie = (v) => {
        (u(),
          G((l) => {
            const n = l.trim();
            return n ? `${n} • ${v}` : v;
          }));
      },
      je = (v) => {
        (u(), G(v));
      },
      Se = () => {
        (oe(), k(S.trim() || w, D, J), h());
      };
    return e.jsx("div", {
      className:
        "fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-3 sm:p-4 backdrop-blur-xs animate-in fade-in duration-200",
      children: e.jsxs("div", {
        className:
          "w-full max-w-lg bg-slate-900 border border-slate-800 rounded-3xl p-4 sm:p-6 space-y-4 shadow-2xl relative max-h-[90vh] overflow-y-auto",
        children: [
          e.jsxs("div", {
            className:
              "flex items-center justify-between pb-3 border-b border-slate-800",
            children: [
              e.jsxs("div", {
                className: "flex items-center gap-2.5",
                children: [
                  e.jsx("div", {
                    className:
                      "w-9 h-9 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center font-black",
                    children: e.jsx(Xe, { className: "w-5 h-5" }),
                  }),
                  e.jsxs("div", {
                    children: [
                      e.jsx("h3", {
                        className: "font-black text-sm sm:text-base text-white",
                        children: "Bandeau Défilant & Moyens de Paiement",
                      }),
                      e.jsx("p", {
                        className: "text-[11px] text-slate-400",
                        children:
                          "Personnalisez les messages promotionnels et les options de paiement",
                      }),
                    ],
                  }),
                ],
              }),
              e.jsx("button", {
                type: "button",
                onClick: () => {
                  (u(), h());
                },
                className:
                  "p-1.5 rounded-full bg-slate-800 text-slate-400 hover:text-white transition",
                children: e.jsx(Re, { className: "w-4 h-4" }),
              }),
            ],
          }),
          e.jsxs("div", {
            className: "space-y-1.5",
            children: [
              e.jsxs("span", {
                className:
                  "text-[11px] font-bold text-slate-300 flex items-center gap-1.5",
                children: [
                  e.jsx(ps, { className: "w-3.5 h-3.5 text-amber-400" }),
                  "Aperçu en direct sur votre vitrine :",
                ],
              }),
              e.jsxs("div", {
                className: `bg-gradient-to-r ${D} rounded-2xl p-2 text-white text-xs font-black shadow-md overflow-hidden whitespace-nowrap flex items-center gap-2 transition-all`,
                children: [
                  e.jsx(Xe, {
                    className:
                      "w-4 h-4 text-amber-200 shrink-0 ml-1 animate-pulse",
                  }),
                  e.jsx("div", {
                    className:
                      "inline-block animate-marquee uppercase tracking-wider font-extrabold text-[11px]",
                    children: S.trim() || "⚡ VOTRE MESSAGE DÉFILERA ICI...",
                  }),
                ],
              }),
            ],
          }),
          e.jsxs("div", {
            className:
              "flex items-center justify-between p-3 bg-slate-950 border border-slate-800 rounded-2xl",
            children: [
              e.jsxs("div", {
                children: [
                  e.jsx("span", {
                    className: "text-xs font-bold text-white block",
                    children: "Afficher le bandeau sur la boutique",
                  }),
                  e.jsx("span", {
                    className: "text-[10px] text-slate-400",
                    children:
                      "Active ou désactive la barre défilante en haut du catalogue",
                  }),
                ],
              }),
              e.jsx("button", {
                type: "button",
                onClick: () => {
                  (u(), ye(!J));
                },
                className: `w-12 h-6.5 rounded-full p-0.5 transition-colors cursor-pointer ${J ? "bg-emerald-600" : "bg-slate-800"}`,
                children: e.jsx("div", {
                  className: `w-5.5 h-5.5 rounded-full bg-white transition-transform ${J ? "translate-x-5.5" : "translate-x-0"}`,
                }),
              }),
            ],
          }),
          e.jsxs("div", {
            className: "space-y-1.5",
            children: [
              e.jsx("label", {
                className: "text-xs font-bold text-slate-300 block",
                children: "Texte du message défilant",
              }),
              e.jsx("textarea", {
                rows: 3,
                value: S,
                onChange: (v) => G(v.target.value),
                placeholder:
                  "Ex: 💳 PAIEMENT WAVE & ORANGE MONEY • LIVRAISON EN 30 MIN...",
                className:
                  "w-full bg-slate-950 border border-slate-800 rounded-2xl p-3 text-xs text-white placeholder:text-slate-600 focus:border-amber-500 focus:outline-none leading-relaxed",
              }),
            ],
          }),
          e.jsxs("div", {
            className: "space-y-1.5",
            children: [
              e.jsx("span", {
                className: "text-[10.5px] font-bold text-slate-400",
                children: "Ajouter un élément en 1 clic :",
              }),
              e.jsx("div", {
                className: "flex flex-wrap gap-1.5",
                children: Ga.map((v) =>
                  e.jsxs(
                    "button",
                    {
                      type: "button",
                      onClick: () => ie(v),
                      className:
                        "bg-slate-800 hover:bg-slate-700 active:scale-95 text-slate-200 text-[10px] font-bold px-2.5 py-1 rounded-xl border border-slate-700/60 transition cursor-pointer",
                      children: ["+ ", v],
                    },
                    v,
                  ),
                ),
              }),
            ],
          }),
          e.jsxs("div", {
            className: "space-y-1.5 pt-1",
            children: [
              e.jsx("span", {
                className: "text-[10.5px] font-bold text-slate-400",
                children: "Ou choisir un modèle prêt à l'emploi :",
              }),
              e.jsx("div", {
                className: "grid grid-cols-1 sm:grid-cols-3 gap-2",
                children: Ja.map((v, l) =>
                  e.jsxs(
                    "button",
                    {
                      type: "button",
                      onClick: () => je(v.text),
                      className:
                        "p-2.5 bg-slate-950 hover:bg-slate-800/80 active:scale-95 border border-slate-800 rounded-xl text-left transition cursor-pointer group",
                      children: [
                        e.jsx("div", {
                          className:
                            "text-[10.5px] font-bold text-amber-400 group-hover:text-amber-300",
                          children: v.title,
                        }),
                        e.jsx("div", {
                          className:
                            "text-[9.5px] text-slate-400 line-clamp-2 mt-0.5",
                          children: v.text,
                        }),
                      ],
                    },
                    l,
                  ),
                ),
              }),
            ],
          }),
          e.jsxs("div", {
            className: "space-y-1.5 pt-1",
            children: [
              e.jsxs("span", {
                className:
                  "text-[10.5px] font-bold text-slate-400 flex items-center gap-1",
                children: [
                  e.jsx(Nt, { className: "w-3 h-3 text-indigo-400" }),
                  "Style & Couleur du bandeau :",
                ],
              }),
              e.jsx("div", {
                className: "flex flex-wrap gap-2",
                children: za.map((v) =>
                  e.jsxs(
                    "button",
                    {
                      type: "button",
                      onClick: () => {
                        (u(), X(v.class));
                      },
                      className: `flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer border ${D === v.class ? "border-white bg-slate-800 text-white shadow-sm" : "border-slate-800 bg-slate-950 text-slate-400 hover:text-slate-200"}`,
                      children: [
                        e.jsx("span", { children: v.icon }),
                        e.jsx("span", {
                          className: "text-[10.5px]",
                          children: v.name,
                        }),
                      ],
                    },
                    v.id,
                  ),
                ),
              }),
            ],
          }),
          e.jsxs("div", {
            className: "flex items-center gap-2 pt-3 border-t border-slate-800",
            children: [
              e.jsx("button", {
                type: "button",
                onClick: () => {
                  (u(), h());
                },
                className:
                  "flex-1 bg-slate-800 hover:bg-slate-700 active:scale-95 py-2.5 rounded-xl text-xs font-bold text-slate-300 transition cursor-pointer",
                children: "Annuler",
              }),
              e.jsxs("button", {
                type: "button",
                onClick: Se,
                className:
                  "flex-1 bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white py-2.5 rounded-xl text-xs font-black transition cursor-pointer shadow-md shadow-emerald-600/30 flex items-center justify-center gap-1.5",
                children: [
                  e.jsx(fs, { className: "w-4 h-4" }),
                  e.jsx("span", { children: "Valider & Appliquer" }),
                ],
              }),
            ],
          }),
        ],
      }),
    });
  },
  Ha = "Nanasore - Votre plateforme E-commerce & E-learning",
  Ka =
    "Créez votre propre plateforme e-commerce ou campus e-learning en marque blanche. Lancez votre business en ligne sans écrire de code et encaissez via Mobile Money.",
  Qa = "https://nsore.shop/assets/og-nanasore.jpg",
  Xa = "https://nsore.shop";
function C(x, h, w) {
  if (typeof document > "u") return;
  let c = document.querySelector(`meta[${x}="${h}"]`);
  (c ||
    ((c = document.createElement("meta")),
    c.setAttribute(x, h),
    document.head.appendChild(c)),
    c.setAttribute("content", w));
}
function Za(x, h) {
  if (typeof document > "u") return;
  let w = document.querySelector(`link[rel="${x}"]`);
  (w ||
    ((w = document.createElement("link")),
    w.setAttribute("rel", x),
    document.head.appendChild(w)),
    w.setAttribute("href", h));
}
function er(x) {
  const {
    title: h,
    description: w,
    image: c,
    url: E,
    type: V = "website",
    price: y,
    currency: O = "XOF",
    siteName: k = "Nanasore",
  } = x;
  r.useEffect(() => {
    if (typeof window > "u" || typeof document > "u") return;
    const A = h ? `${h}` : Ha;
    document.title = A;
    const U = w || Ka;
    C("name", "description", U);
    const _ = E || (window.location.origin ? window.location.href : Xa);
    (Za("canonical", _),
      C("property", "og:site_name", k),
      C("property", "og:type", V),
      C("property", "og:title", A),
      C("property", "og:description", U),
      C("property", "og:url", _));
    const S = c && c.startsWith("http") ? c : Qa;
    (C("property", "og:image", S),
      C("property", "og:image:secure_url", S),
      C("property", "og:image:width", "1200"),
      C("property", "og:image:height", "630"),
      y != null &&
        y !== "" &&
        (C("property", "product:price:amount", String(y)),
        C("property", "product:price:currency", O)),
      C("name", "twitter:card", "summary_large_image"),
      C("name", "twitter:title", A),
      C("name", "twitter:description", U),
      C("name", "twitter:image", S),
      C("name", "twitter:url", _));
  }, [h, w, c, E, V, y, O, k]);
}
const tr = (x, h) => {
    if (!x) return { role: "CLIENT" };
    if (x.role === "SUPER_ADMIN")
      return {
        userId: x.id,
        storeId: h || x.storeId,
        role: "SUPER_ADMIN",
        email: x.email,
      };
    const w = x.storeId;
    return (!h || h === w) &&
      (x.role === "GERANT" ||
        x.role === "ADMIN" ||
        x.role === "EMPLOYE" ||
        x.role === "demo" ||
        x.role === "TENANT_MANAGER")
      ? { userId: x.id, storeId: w, role: "MERCHANT", email: x.email }
      : { userId: x.id, role: "CLIENT", email: x.email };
  },
  sr = (x, h) =>
    x
      ? x.role === "SUPER_ADMIN"
        ? !0
        : x.role === "MERCHANT"
          ? !h || !x.storeId
            ? !0
            : x.storeId === h
          : !1
      : !1,
  ar = (x, h) => sr(x, h),
  rr = us.lazy(() =>
    import("../../components/ai/MarketingAIAssistantModal").then((x) => ({ default: x.MarketingAIAssistantModal }))
  ),
  Me =
    "⚡ PROMO FLASH : LIVRAISON OFFERTE DÈS 10 000 F CFA AUJOURD'HUI ! • PAIEMENT À LA RÉCEPTION (WAVE / ORANGE MONEY / CASH) • COMMANDE RAPIDE EN 1 CLIC SUR WHATSAPP • SERVICE CLIENT 7J/7",
  nr = [
    {
      image:
        "https://images.unsplash.com/photo-1542838132-92c53300491e?w=1200&auto=format&fit=crop&q=80",
      badge: "🔥 PROMOTION FLASH",
      title: "Jusqu'à -25% sur l'Alimentation !",
      subtitle: "Riz, huiles raffinées et laits en promotion cette semaine",
    },
    {
      image:
        "https://images.unsplash.com/photo-1607082348824-0a96f2a4b9da?w=1200&auto=format&fit=crop&q=80",
      badge: "⚡ ARRIVAGE DU JOUR",
      title: "Produits Frais & Disponibilité Garantie",
      subtitle: "Livraison à domicile en moins de 30 minutes",
    },
    {
      image:
        "https://images.unsplash.com/photo-1578916171728-46686eac8d58?w=1200&auto=format&fit=crop&q=80",
      badge: "🛵 SERVICE LIVRAISON RAPIDE",
      title: "Commandez en 1 Clic sur WhatsApp",
      subtitle: "Paiement à la réception par Wave, Orange Money ou Espèces",
    },
  ],
  wt = [
    {
      id: "p-1",
      name: "Riz Parfumé 25kg Qualité Supérieure",
      price: 17500,
      originalPrice: 2e4,
      category: "Alimentation",
      image:
        "https://images.unsplash.com/photo-1586201375761-83865001e31c?w=600&auto=format&fit=crop&q=80",
      stock: 24,
      description:
        "Riz blanc parfumé 100% brisures fines, arôme naturel intense, cuisson parfaite en 15 minutes. Sac scellé d'origine.",
      badge: "Promo -15%",
    },
    {
      id: "p-2",
      name: "Bidon d'Huile Végétale Raffinée 5L",
      price: 6500,
      originalPrice: 7500,
      category: "Alimentation",
      image:
        "https://images.unsplash.com/photo-1474979266404-7eaacbcd87c5?w=600&auto=format&fit=crop&q=80",
      stock: 18,
      description:
        "Huile de table enrichie en vitamines A et D, sans cholestérol, idéale pour fritures croustillantes et assaisonnements.",
      badge: "Top Vente",
    },
    {
      id: "p-3",
      name: "Carton Lait Bonnet Rouge (48 boîtes)",
      price: 8500,
      originalPrice: 9500,
      category: "Boissons",
      image:
        "https://images.unsplash.com/photo-1550583724-b2692b85b150?w=600&auto=format&fit=crop&q=80",
      stock: 35,
      description:
        "Lait concentré non sucré onctueux, riche en calcium et protéines. Le partenaire incontournable de votre petit-déjeuner.",
      badge: "Nouveau",
    },
    {
      id: "p-4",
      name: "Sucre Pur Canne en Morceaux SOSUCO 1kg",
      price: 900,
      originalPrice: 1e3,
      category: "Alimentation",
      image:
        "https://images.unsplash.com/photo-1581441363689-1f3c3c414635?w=600&auto=format&fit=crop&q=80",
      stock: 50,
      description:
        "Sucre de canne raffiné produit au pays, dissolution instantanée pour votre café, thé et bouillies.",
      badge: "Essentiel",
    },
    {
      id: "p-5",
      name: "Savon de Marseille BF Format Économique",
      price: 450,
      originalPrice: 500,
      category: "Entretien",
      image:
        "https://images.unsplash.com/photo-1607006314605-6447c23173d1?w=600&auto=format&fit=crop&q=80",
      stock: 65,
      description:
        "Savon ménager extra-moussant pour le linge et l'hygiène familiale. Doux pour les mains et résistant à l'eau.",
      badge: "Prix Bas",
    },
    {
      id: "p-6",
      name: "Pack Jus de Fruits Naturels 1L (x6)",
      price: 4200,
      originalPrice: 4800,
      category: "Boissons",
      image:
        "https://images.unsplash.com/photo-1622483767028-3f66f32aef97?w=600&auto=format&fit=crop&q=80",
      stock: 20,
      description:
        "Jus d'orange et d'ananas 100% pur jus sans conservateurs. À consommer bien frais en famille.",
      badge: "Promo",
    },
    {
      id: "p-7",
      name: "Spaghetti Qualité Supérieure 500g (x5)",
      price: 1800,
      originalPrice: 2e3,
      category: "Alimentation",
      image:
        "https://images.unsplash.com/photo-1551462147-ff29053bfc14?w=600&auto=format&fit=crop&q=80",
      stock: 42,
      description:
        "Pâtes au blé dur sélectionné, ne collent pas à la cuisson, parfaites pour vos sauces tomates et ragouts.",
      badge: "Top Vente",
    },
    {
      id: "p-8",
      name: "Boîte Tomates Concentrées 400g (Lot de 3)",
      price: 1200,
      originalPrice: 1400,
      category: "Alimentation",
      image:
        "https://images.unsplash.com/photo-1592924357228-91a4daadcfea?w=600&auto=format&fit=crop&q=80",
      stock: 38,
      description:
        "Concentré de tomates mûres rouge vif, rehausse le goût et la couleur de toutes vos sauces africaines.",
    },
  ],
  Vr = ({
    sales: x = [],
    inventory: h = [],
    customers: w = [],
    currentUser: c = null,
    subscription: E = null,
    onOpenUpgrade: V = () => {},
    onBack: y = () => {},
    onBackToHome: O = () => {},
    onBackToPos: k = () => {},
    onBackToHub: A = () => {},
    onOpenStudio: U,
    onAddInventoryProduct: _ = () => {},
    onUpdateCurrentUser: S = () => {},
    initialProductId: G = null,
    isPublicVitrine: D = !1,
    onRequireManagerAuth: X = () => {},
    overrideStoreId: J = null,
    whiteLabelConfig: ye = void 0,
  }) => {
    const ie = r.useCallback(() => {
        (u(),
          U
            ? U()
            : typeof window < "u" &&
              (window.history.pushState({}, "", "/studio"),
              window.dispatchEvent(new PopStateEvent("popstate"))));
      }, [U]),
      je = r.useCallback(() => {
        (u(),
          k
            ? k()
            : y
              ? y()
              : typeof window < "u" && (window.location.href = "/"));
      }, [k, y]),
      Se = r.useCallback(() => {
        (u(),
          A
            ? A()
            : O
              ? O()
              : typeof window < "u" && (window.location.href = "/"));
      }, [A, O]),
      [, v] = r.useState(0);
    r.useEffect(() => {
      const t = () => {
        v((s) => s + 1);
      };
      return (
        window.addEventListener("superAdminUpdated", t),
        () => window.removeEventListener("superAdminUpdated", t)
      );
    }, []);
    const l = r.useMemo(() => {
        if (J) return J;
        if (typeof window < "u") {
          const t = window.location.pathname;
          if (t.startsWith("/shop/")) {
            const a = t.split("/shop/");
            if (a[1])
              return decodeURIComponent(a[1].split("/")[0].split("?")[0]);
          }
          if (t.startsWith("/boutique/")) {
            const a = t.split("/boutique/");
            if (a[1])
              return decodeURIComponent(a[1].split("/")[0].split("?")[0]);
          }
          if (t.startsWith("/store/")) {
            const a = t.split("/store/");
            if (a[1])
              return decodeURIComponent(a[1].split("/")[0].split("?")[0]);
          }
          const s = new URLSearchParams(window.location.search),
            o =
              s.get("storeId") ||
              s.get("store") ||
              s.get("merchant") ||
              s.get("merchantId") ||
              s.get("boutique") ||
              s.get("shop");
          if (o) return o;
        }
        return (
          c?.storeId ||
          (re.currentUser
            ? re.currentUser.uid
            : (typeof window < "u" &&
                localStorage.getItem("nana_demo_store_id")) ||
              "store-isolated")
        );
      }, [J, c]),
      [n, j] = r.useState({
        storeName: c?.storeName || "Ma Boutique Nana",
        slug:
          (c?.storeName || "ma-boutique")
            .toLowerCase()
            .trim()
            .replace(/[^a-z0-9]+/g, "-")
            .replace(/^-+|-+$/g, "") || "ma-boutique",
        customDomain: "",
        primaryColor: "#059669",
        welcomeText:
          "Faites vos courses en ligne • Livraison express en 30 minutes !",
        whatsappPhone: c?.phone || "+226 70 00 00 00",
        paymentTickerText: Me,
        tickerBgGradient: "from-amber-600 via-orange-600 to-amber-600",
        showPaymentTicker: !0,
        fbPixelId: "",
        tiktokPixelId: "",
        bannerImage: "",
        logoUrl: c?.avatarUrl || "",
        promoBanners: [],
        layoutBlocks: [],
        active_theme_id:
          (typeof window < "u"
            ? new URLSearchParams(window.location.search).get(
                "preview_theme",
              ) ||
              new URLSearchParams(window.location.search).get("previewTheme") ||
              new URLSearchParams(window.location.search).get("theme") ||
              new URLSearchParams(window.location.search).get("themeId") ||
              localStorage.getItem("nana_active_theme_id") ||
              localStorage.getItem(`nana_boutique_theme_id_${l}`) ||
              localStorage.getItem("nana_boutique_theme_id")
            : null) || "theme-default",
      }),
      i = oa(n, c) || n?.slug || c?.storeId || c?.uid || "ma-boutique";
    r.useEffect(() => {
      typeof window < "u" && i && (window.storeSlug = i);
    }, [i]);
    const [M, Y] = r.useState(!1),
      [te, $] = r.useState("desktop"),
      [P, H] = r.useState(!1),
      [K, xe] = r.useState(null),
      b = r.useCallback((t) => {
        (xe(t), setTimeout(() => xe(null), 3e3));
      }, []),
      { theme: Le, setTheme: Oe } = ia(),
      W = Le,
      Ze = r.useCallback(
        (t) => {
          if ((u(), Oe(t), typeof window < "u"))
            try {
              (localStorage.setItem(`nana_boutique_theme_${l}`, t),
                localStorage.setItem("nana_boutique_global_theme", t),
                localStorage.setItem(`nana_tenant_${l}_theme`, t));
            } catch {}
          (j((s) => ({ ...s, theme: t })),
            b(
              t === "light"
                ? "☀️ Mode Blanc Pur activé"
                : t === "blue"
                  ? "💧 Mode Pur Bleu activé (Signature Brand)"
                  : "🌙 Mode Sombre activé",
            ));
        },
        [l, Oe, b],
      );
    r.useCallback(
      (t) => {
        u();
        const s =
          t || (Le === "dark" ? "light" : Le === "light" ? "blue" : "dark");
        if ((Oe(s), typeof window < "u"))
          try {
            (localStorage.setItem(`nana_boutique_theme_${l}`, s),
              localStorage.setItem("nana_boutique_global_theme", s),
              localStorage.setItem(`nana_tenant_${l}_theme`, s));
          } catch {}
        return (
          j((o) => ({ ...o, theme: s })),
          b(
            s === "light"
              ? "☀️ Mode Blanc Pur activé"
              : s === "blue"
                ? "💧 Mode Pur Bleu activé"
                : "🌙 Mode Sombre activé",
          ),
          s
        );
      },
      [l, Le, Oe, b],
    );
    const [yt, bs] = r.useState(!1),
      [De, gs] = r.useState(null),
      [jt, ws] = r.useState(!1),
      [vs, St] = r.useState(!1),
      [ke, kt] = r.useState(null),
      [Ns, ys] = r.useState(() => Yt());
    r.useEffect(() => {
      const t = () => ys(Yt());
      return (
        window.addEventListener("tutorialProgressUpdated", t),
        () => window.removeEventListener("tutorialProgressUpdated", t)
      );
    }, []);
    const et = r.useRef(null);
    r.useRef(null);
    const js = r.useRef(null),
      Ss = r.useRef(null),
      Ct = r.useRef(null),
      [or, ks] = r.useState(0),
      [$e, ir] = r.useState(""),
      [Pt, Cs] = r.useState(""),
      [tt, lr] = r.useState("TOUS"),
      [g, le] = r.useState(null);
    (er({
      title: g
        ? `${g.name} - ${g.price ? Number(g.price).toLocaleString("fr-FR") + " FCFA | " : ""}${n.storeName}`
        : `${n.storeName} | Vitrine Officielle sur Nanasore`,
      description: g
        ? g.description ||
          `Commandez ${g.name} au prix de ${g.price} FCFA chez ${n.storeName}. Livraison express et paiement Mobile Money sécurisé.`
        : n.welcomeText ||
          `Découvrez la boutique officielle ${n.storeName} sur Nanasore. Catalogue en ligne et commande directe.`,
      image: g
        ? g.image || n.logoUrl || "https://nsore.shop/assets/og-nanasore.jpg"
        : n.bannerImage ||
          n.logoUrl ||
          "https://nsore.shop/assets/og-nanasore.jpg",
      url: g
        ? buildPublicShopUrl(l, { productSlug: g.productSlug || g.id, themeId: Ke })
        : buildPublicShopUrl(l, { themeId: Ke }),
      type: g ? "product" : "website",
      price: g ? g.price : void 0,
      currency: "XOF",
    }),
      r.useEffect(() => {
        if (!(typeof window > "u"))
          if (g) {
            const t = `/boutique/${encodeURIComponent(l)}/p/${encodeURIComponent(g.id)}`;
            window.location.pathname !== t &&
              window.history.replaceState({ productId: g.id }, "", t);
          } else {
            const t = `/boutique/${encodeURIComponent(l)}`;
            window.location.pathname.includes("/p/") &&
              window.history.replaceState({}, "", t);
          }
      }, [g, l]));
    const [Ps, qe] = r.useState(!1),
      [Is, Fe] = r.useState(null),
      [st, ce] = r.useState([]),
      [As, Ce] = r.useState(!1),
      [Es, at] = r.useState(!1),
      [_s, It] = r.useState(!1),
      [Ms, rt] = r.useState(!1),
      [q, cr] = r.useState(null),
      [he, nt] = r.useState(() => {
        if (typeof window < "u")
          try {
            const t = localStorage.getItem(`nana_boutique_cart_${l}`);
            if (t) return JSON.parse(t);
          } catch {}
        return [];
      }),
      [Ts, pe] = r.useState(!1),
      [de, dr] = r.useState(
        () =>
          (typeof window < "u" && localStorage.getItem("nana_customer_name")) ||
          "",
      ),
      [fe, mr] = r.useState(
        () =>
          (typeof window < "u" &&
            localStorage.getItem("nana_customer_phone")) ||
          "",
      ),
      [me, ur] = r.useState(
        () =>
          (typeof window < "u" &&
            localStorage.getItem("nana_customer_address")) ||
          "",
      ),
      [be, xr] = r.useState(
        () =>
          (typeof window < "u" &&
            localStorage.getItem("nana_customer_email")) ||
          "",
      ),
      [Be, Ve] = r.useState(null),
      [hr, pr] = r.useState("cod"),
      [Pe, At] = r.useState(null),
      Et = r.useMemo(
        () => x.reduce((t, s) => t + (s.totalAmount || s.total || 0), 0),
        [x],
      ),
      [fr, _t] = r.useState(!1),
      [br, Ue] = r.useState(!1),
      [Mt, Tt] = r.useState(!1),
      [Rt, Rs] = r.useState(() => {
        try {
          const t = localStorage.getItem(`nana_tenant_${l}_removed_products`);
          if (t) return JSON.parse(t);
        } catch {}
        return [];
      }),
      [se, ot] = r.useState(() =>
        isSuperAdminLocally(c)
          ? "verified"
          : c?.kycStatus
          ? c.kycStatus
          : localStorage.getItem(`nana_tenant_${l}_kyc_status`) || "unverified",
      ),
      [Ls, it] = r.useState(null),
      [Os, Ie] = r.useState(!1),
      [Ds, lt] = r.useState(!1),
      ge = r.useMemo(() => {
        if (D) return !0;
        if (typeof window < "u") {
          const t = new URLSearchParams(window.location.search),
            s = window.location.pathname;
          if (
            t.has("store") ||
            t.has("storeId") ||
            t.has("boutique") ||
            t.has("shop") ||
            t.has("merchant") ||
            t.has("merchantId") ||
            s.startsWith("/shop/") ||
            s.startsWith("/boutique/") ||
            s.startsWith("/store/") ||
            s.startsWith("/vitrine/")
          )
            return !0;
        }
        return !1;
      }, [D]),
      [ae, $s] = r.useState(() => {
        if (typeof window < "u") {
          const t = new URLSearchParams(window.location.search),
            s = window.location.pathname;
          if (!(
            D ||
            t.has("store") ||
            t.has("storeId") ||
            t.has("boutique") ||
            t.has("shop") ||
            t.has("merchant") ||
            t.has("merchantId") ||
            s.startsWith("/shop/") ||
            s.startsWith("/boutique/") ||
            s.startsWith("/store/") ||
            s.startsWith("/vitrine/")
          ))
            return !0;
          try {
            if (sessionStorage.getItem(`nana_store_unlocked_${l}`) === "true")
              return !0;
          } catch {}
        }
        return !1;
      }),
      [Lt, We] = r.useState(!1),
      [qs, ct] = r.useState(""),
      [ze, dt] = r.useState(() => {
        if (typeof window < "u") {
          const t = new URLSearchParams(window.location.search),
            s = window.location.pathname;
          if (
            D ||
            t.has("store") ||
            t.has("storeId") ||
            t.has("boutique") ||
            t.has("shop") ||
            t.has("merchant") ||
            t.has("merchantId") ||
            s.startsWith("/shop/") ||
            s.startsWith("/boutique/") ||
            s.startsWith("/store/") ||
            s.startsWith("/vitrine/")
          ) {
            try {
              if (
                sessionStorage.getItem(`nana_store_unlocked_${l}`) === "true"
              ) {
                const a = localStorage.getItem(`nana_vitrine_view_mode_${l}`);
                return a === "merchant" || a === "client" ? a : "merchant";
              }
            } catch {}
            return "client";
          }
          try {
            const a = localStorage.getItem(`nana_vitrine_view_mode_${l}`);
            if (a === "merchant" || a === "client") return a;
          } catch {}
        }
        return "merchant";
      }),
      N = r.useMemo(() => (ge && !ae ? !0 : ze === "client"), [ge, ae, ze]),
      Fs = r.useMemo(() => (N ? { role: "CLIENT" } : tr(c, l)), [c, l, N]),
      T = r.useMemo(() => !N, [N]),
      mt = r.useMemo(() => !N, [N]),
      Bs = r.useMemo(() => !N, [N]),
      [Ge, Vs] = r.useState(() => la(l)),
      [Ot, ut] = r.useState(!1),
      [Us, Dt] = r.useState(null);
    r.useEffect(() => {
      if (!l) return;
      const t = ca(
        l,
        (s) => {
          Vs(s);
        },
        (s) => {
          (!N || ae || T) && Dt(s);
        },
      );
      return () => t();
    }, [l, N, ae, T]);
    const Je = r.useMemo(
      () =>
        Ge.filter(
          (t) =>
            !t.deliveryStatus ||
            t.deliveryStatus === "Nouvelle commande" ||
            t.status === "EN_ATTENTE",
        ).length,
      [Ge],
    );
    (r.useCallback(() => {
      if ((u(), ge && !ae)) {
        We(!0);
        return;
      }
      dt("merchant");
      try {
        localStorage.setItem(`nana_vitrine_view_mode_${l}`, "merchant");
      } catch {}
      b("👑 Mode Commerçant activé : Outils de gestion déverrouillés");
    }, [ge, ae, l, b]),
      r.useCallback(
        (t) => {
          u();
          const s = t || (ze === "merchant" ? "client" : "merchant");
          if (s === "merchant" && ge && !ae) {
            We(!0);
            return;
          }
          dt(s);
          try {
            localStorage.setItem(`nana_vitrine_view_mode_${l}`, s);
          } catch {}
          b(
            s === "merchant"
              ? "👑 Mode Commerçant activé : Outils de gestion déverrouillés"
              : "👁️ Aperçu Client activé : Vue fidèle pour vos acheteurs",
          );
        },
        [ze, ge, ae, l, b],
      ));
    const [$t, qt] = r.useState(null),
      [Ft, Bt] = r.useState(!1),
      Ws = r.useCallback((t, s) => {
        (s && s.stopPropagation(), u(), qt(t), Bt(!0));
      }, []),
      Vt = r.useMemo(() => Ta(n?.paymentConfig || {}), [n]);
    (r.useEffect(() => {
      const t = setTimeout(() => {
        Cs($e);
      }, 300);
      return () => clearTimeout(t);
    }, [$e]),
      r.useEffect(() => {
        try {
          localStorage.setItem(`nana_boutique_cart_${l}`, JSON.stringify(he));
        } catch {}
      }, [he, l]),
      r.useEffect(() => {
        try {
          (de && localStorage.setItem("nana_customer_name", de),
            fe && localStorage.setItem("nana_customer_phone", fe),
            me && localStorage.setItem("nana_customer_address", me),
            be && localStorage.setItem("nana_customer_email", be));
        } catch {}
      }, [de, fe, me, be]),
      r.useEffect(() => {
        (n.fbPixelId && Da(n.fbPixelId),
          n.tiktokPixelId && $a(n.tiktokPixelId));
      }, [n.fbPixelId, n.tiktokPixelId]),
      r.useEffect(() => {
        (async () => {
          const o = await Ua(l);
          o && (it(o), ot(o.status));
        })();
        const s = (o) => {
          const a = o.detail;
          (!a || !a.storeId || a.storeId === l) &&
            (a?.status && ot(a.status),
            a?.data && it(a.data),
            S &&
              c &&
              S({ ...c, kycStatus: a.status, kycData: a.data || c.kycData }));
        };
        return (
          window.addEventListener("nana_kyc_status_changed", s),
          () => window.removeEventListener("nana_kyc_status_changed", s)
        );
      }, [l, c, S]),
      r.useEffect(() => {
        (async () => {
          if (!N) {
            const s =
              localStorage.getItem(`nana_tenant_${l}_store_config`) ||
              localStorage.getItem("nana_store_hub_config");
            if (s)
              try {
                const o = JSON.parse(s);
                (j((a) => ({
                  ...a,
                  ...o,
                  storeName: o.storeName || c?.storeName || a.storeName,
                  whatsappPhone: o.whatsappPhone || c?.phone || a.whatsappPhone,
                  logoUrl: o.logoUrl || a.logoUrl || c?.avatarUrl,
                  paymentTickerText:
                    o.paymentTickerText || a.paymentTickerText || Me,
                  tickerBgGradient:
                    o.tickerBgGradient ||
                    a.tickerBgGradient ||
                    "from-amber-600 via-orange-600 to-amber-600",
                  showPaymentTicker:
                    o.showPaymentTicker !== void 0 ? o.showPaymentTicker : !0,
                  fbPixelId: o.fbPixelId || a.fbPixelId || "",
                  tiktokPixelId: o.tiktokPixelId || a.tiktokPixelId || "",
                  active_theme_id:
                    (typeof window < "u"
                      ? new URLSearchParams(window.location.search).get(
                          "preview_theme",
                        ) ||
                        new URLSearchParams(window.location.search).get(
                          "previewTheme",
                        ) ||
                        new URLSearchParams(window.location.search).get(
                          "theme",
                        ) ||
                        new URLSearchParams(window.location.search).get(
                          "themeId",
                        )
                      : null) ||
                    o.active_theme_id ||
                    o.activeThemeId ||
                    a.active_theme_id ||
                    "theme-standard-elite",
                  theme: o.theme || a.theme || "dark",
                })),
                  (o.theme === "light" || o.theme === "dark") &&
                    setStoreTheme(o.theme));
              } catch (o) {
                console.error("Erreur parsing cache boutique", o);
              }
            try {
              const o = localStorage.getItem(
                `nana_tenant_${l}_custom_store_products`,
              );
              if (o) {
                const a = JSON.parse(o);
                if (Array.isArray(a)) {
                  const d = new Set(),
                    m = a.filter((p) =>
                      !p?.id || d.has(p.id) ? !1 : (d.add(p.id), !0),
                    );
                  ce(m);
                }
              }
            } catch (o) {
              console.error("Erreur lecture custom products", o);
            }
          }
          try {
            const s = wa(ee, "stores", l, "products"),
              o = await va(s);
            if (!o.empty) {
              const a = [];
              (o.forEach((d) => {
                a.push({ ...d.data(), id: d.id, storeId: l });
              }),
                a.length > 0 &&
                  ce((d) => {
                    const m = new Map();
                    (d.forEach((f) => {
                      f?.id && m.set(f.id, f);
                    }),
                      a.forEach((f) => m.set(f.id, f)));
                    const p = Array.from(m.values());
                    try {
                      localStorage.setItem(
                        `nana_tenant_${l}_custom_store_products`,
                        JSON.stringify(p),
                      );
                    } catch {}
                    return p;
                  }));
            }
          } catch (s) {
            console.warn("Synchronisation distante produits vitrine :", s);
          }
          try {
            const s = ne(ee, "stores", l),
              o = await Qt(s);
            if (o.exists()) {
              const a = o.data(),
                d = a.storeSlug || a.slug,
                m = pt(
                  d,
                  a.storeName || c?.storeName,
                  c?.email || c?.displayName,
                  c?.uid || l,
                );
              ((!d || d.trim().length < 2 || d === "boutique-officielle") &&
                c?.uid &&
                Kt(s, { slug: m, storeSlug: m }).catch(console.warn),
                (a.masterPin || a.pinCode || a.adminPin) &&
                  ct(a.masterPin || a.pinCode || a.adminPin),
                j((p) => ({
                  ...p,
                  ...a,
                  slug: m,
                  storeSlug: m,
                  logoUrl: a.logoUrl || p.logoUrl || c?.avatarUrl,
                  paymentTickerText:
                    a.paymentTickerText || p.paymentTickerText || Me,
                  tickerBgGradient:
                    a.tickerBgGradient ||
                    p.tickerBgGradient ||
                    "from-amber-600 via-orange-600 to-amber-600",
                  showPaymentTicker:
                    a.showPaymentTicker !== void 0 ? a.showPaymentTicker : !0,
                  fbPixelId: a.fbPixelId || p.fbPixelId || "",
                  active_theme_id:
                    (typeof window < "u"
                      ? new URLSearchParams(window.location.search).get(
                          "preview_theme",
                        ) ||
                        new URLSearchParams(window.location.search).get(
                          "previewTheme",
                        ) ||
                        new URLSearchParams(window.location.search).get(
                          "theme",
                        ) ||
                        new URLSearchParams(window.location.search).get(
                          "themeId",
                        )
                      : null) ||
                    a.activeThemeId ||
                    a.active_theme_id ||
                    p.active_theme_id ||
                    "theme-standard-elite",
                  activeThemeId:
                    a.activeThemeId ||
                    a.active_theme_id ||
                    p.activeThemeId ||
                    "theme-standard-elite",
                  theme: a.theme || p.theme || "dark",
                })),
                (a.theme === "light" || a.theme === "dark") &&
                  setStoreTheme(a.theme));
            } else if (c?.uid && (l === c.uid || l.startsWith("store-"))) {
              const a = pt(
                null,
                c?.storeName,
                c?.email || c?.displayName,
                c?.uid || l,
              );
              ve(
                s,
                {
                  storeName: c?.storeName || "Ma Boutique",
                  slug: a,
                  storeSlug: a,
                  activeThemeId:
                    (typeof window < "u" && localStorage.getItem("nana_active_theme_id")) || "theme-default",
                  active_theme_id:
                    (typeof window < "u" && localStorage.getItem("nana_active_theme_id")) || "theme-default",
                  theme: "dark",
                  createdAt: ft(),
                  updatedAt: ft(),
                },
                { merge: !0 },
              ).catch(console.warn);
            }
            try {
              const a = ne(ee, "users", l),
                d = await Qt(a);
              if (d.exists()) {
                const m = d.data(),
                  p = m.masterPin || m.pinCode || m.adminPin;
                p && ct((f) => f || p);
              }
            } catch {}
            try {
              const a =
                localStorage.getItem("nana_master_pin") ||
                localStorage.getItem(`nana_tenant_${l}_master_pin`) ||
                c?.masterPin ||
                c?.pinCode;
              a && ct((d) => d || a);
            } catch {}
          } catch (s) {
            console.warn(
              "Synchronisation distante différée :",
              s?.message || s,
            );
          }
        })();
      }, [c, l]));
    const xt = r.useMemo(() => {
      const t = [];
      if (n.bannerImage) {
        t.push({
          image: n.bannerImage,
          badge: "🏪 NOTRE VITRINE",
          title: n.storeName,
          subtitle: n.welcomeText,
        });
      }
      if (n.promoBanners && n.promoBanners.length > 0) {
        n.promoBanners.forEach((s, o) => {
          t.push({
            image: s,
            badge: `🔥 PROMO #${o + 1}`,
            title: "Offre Spéciale du Moment",
            subtitle: "Commandez directement sur WhatsApp dès maintenant",
          });
        });
      }
      return t.length > 0 ? t : (nr || []);
    }, [n.bannerImage, n.promoBanners, n.storeName, n.welcomeText]);

    r.useEffect(() => {
      const bannerCount = xt?.length || 0;
      if (bannerCount <= 1) return;
      const t = setInterval(() => {
        ks((s) => {
          const o = (s + 1) % bannerCount;
          if (et.current) {
            const a = et.current.clientWidth;
            et.current.scrollTo({ left: o * a, behavior: "smooth" });
          }
          return o;
        });
      }, 4500);
      return () => clearInterval(t);
    }, [xt]);
    const zs = (t) => {
        if (!T) {
          console.warn(
            "[RBAC GUARD] Modification du logo non autorisée pour un visiteur public",
          );
          return;
        }
        const s = t.target.files?.[0];
        if (!s) return;
        u();
        const o = new FileReader();
        ((o.onload = (a) => {
          const d = new Image();
          ((d.onload = async () => {
            const m = document.createElement("canvas"),
              f = Math.min(400 / Math.max(d.width, d.height), 1);
            ((m.width = d.width * f), (m.height = d.height * f));
            const R = m.getContext("2d");
            if (R) {
              R.drawImage(d, 0, 0, m.width, m.height);
              const L = m.toDataURL("image/jpeg", 0.85),
                F =
                  c?.storeId ||
                  (re.currentUser ? re.currentUser.uid : "store-nana-1");
              (j((B) => {
                const Q = { ...B, logoUrl: L };
                return (
                  localStorage.setItem(
                    `nana_tenant_${F}_store_config`,
                    JSON.stringify(Q),
                  ),
                  Q
                );
              }),
                c && S && S({ ...c, avatarUrl: L }));
              try {
                const B = ne(ee, "stores", F);
                await ve(
                  B,
                  {
                    logoUrl: L,
                    storeName: n.storeName,
                    updatedAt: new Date().toISOString(),
                  },
                  { merge: !0 },
                );
              } catch (B) {
                console.warn("Enregistrement logo Firestore différé :", B);
              }
              (oe(), b("Logo de la boutique mis à jour avec succès !"));
            }
          }),
            typeof a.target?.result == "string" && (d.src = a.target.result));
        }),
          o.readAsDataURL(s));
      },
      Ut = (t, s) => {
        if (!T) {
          console.warn(
            "[RBAC GUARD] Téléversement d'image non autorisé pour un visiteur public",
          );
          return;
        }
        const o = t.target.files?.[0];
        if (!o) return;
        u();
        const a = new FileReader();
        ((a.onload = (d) => {
          const m = new Image();
          ((m.onload = () => {
            const p = document.createElement("canvas"),
              R = Math.min((s === "banner" ? 1200 : 900) / m.width, 1);
            ((p.width = m.width * R), (p.height = m.height * R));
            const L = p.getContext("2d");
            if (L) {
              L.drawImage(m, 0, 0, p.width, p.height);
              const F = p.toDataURL("image/jpeg", 0.85);
              (s === "banner"
                ? (j((B) => {
                    const Q = { ...B, bannerImage: F },
                      ht =
                        c?.storeId ||
                        (re.currentUser ? re.currentUser.uid : "store-nana-1");
                    return (
                      localStorage.setItem(
                        `nana_tenant_${ht}_store_config`,
                        JSON.stringify(Q),
                      ),
                      Q
                    );
                  }),
                  b("Bannière mise à jour avec succès !"))
                : (j((B) => {
                    const Q = { ...B, promoBanners: [F, ...B.promoBanners] },
                      ht =
                        c?.storeId ||
                        (re.currentUser ? re.currentUser.uid : "store-nana-1");
                    return (
                      localStorage.setItem(
                        `nana_tenant_${ht}_store_config`,
                        JSON.stringify(Q),
                      ),
                      Q
                    );
                  }),
                  b("Nouvelle affiche ajoutée au carrousel !")),
                oe());
            }
          }),
            typeof d.target?.result == "string" && (m.src = d.target.result));
        }),
          a.readAsDataURL(o));
      },
      Gs = (t) => {
        if (!T) {
          console.warn(
            "[RBAC GUARD] Ajout de produit non autorisé pour un visiteur public",
          );
          return;
        }
        const s = { ...t, storeId: l };
        (ce((o) => {
          const a = o.filter((m) => m.id !== s.id),
            d = [s, ...a];
          try {
            localStorage.setItem(
              `nana_tenant_${l}_custom_store_products`,
              JSON.stringify(d),
            );
          } catch (m) {
            console.warn("Erreur sauvegarde locale custom products", m);
          }
          return d;
        }),
          Ht(s, l).catch((o) => {
            console.warn(
              "Erreur persistance produit boutique vers Firestore :",
              o,
            );
          }),
          _ && _(s),
          b(`Article "${s.name}" ajouté avec succès au catalogue !`));
      },
      Js = (t) => {
        if (!mt) {
          console.warn(
            "[RBAC GUARD] Mise à jour de produit non autorisée pour un visiteur public",
          );
          return;
        }
        const s = { ...t, storeId: l };
        (ce((o) => {
          const a = o.filter((m) => m.id !== s.id),
            d = [s, ...a];
          try {
            localStorage.setItem(
              `nana_tenant_${l}_custom_store_products`,
              JSON.stringify(d),
            );
          } catch (m) {
            console.warn("Erreur sauvegarde locale custom products", m);
          }
          return d;
        }),
          Ht(s, l).catch((o) => {
            console.warn(
              "Erreur persistance mise à jour produit vers Firestore :",
              o,
            );
          }),
          _ && _(s),
          g &&
            g.id === t.id &&
            le({
              id: t.id,
              name: t.name,
              price: t.sellingPrice,
              originalPrice: t.originalPrice,
              category: t.category,
              image: t.photoUrl || g.image,
              stock: t.stock,
              description: t.description || g.description,
              badge: t.badge,
              hasLiveDemo: !!t.hasLiveDemo,
            }),
          b(`L'article "${t.name}" et sa fiche ont été mis à jour !`));
      },
      Wt = (t) => {
        if (!mt) {
          console.warn(
            "[RBAC GUARD] Édition de produit non autorisée pour un visiteur public",
          );
          return;
        }
        const s = h?.find((m) => m.id === t.id),
          o = st.find((m) => m.id === t.id),
          a = s?.costPrice || o?.costPrice || Math.round(t.price * 0.75),
          d = {
            id: t.id,
            storeId: l,
            name: t.name,
            category: t.category,
            costPrice: a,
            sellingPrice: t.price,
            originalPrice: t.originalPrice,
            stock: t.stock,
            unit: s?.unit || o?.unit || "pièce",
            keywords: [t.name.toLowerCase(), t.category.toLowerCase()],
            photoUrl: t.image,
            description: t.description,
            badge: t.badge,
            hasLiveDemo: !!(t.hasLiveDemo ?? s?.hasLiveDemo ?? o?.hasLiveDemo),
          };
        (Fe(d), qe(!0));
      };
    r.useCallback(
      (t, s) => {
        (s && s.stopPropagation(), u());
        const o = !t.hasLiveDemo;
        (ce((a) => {
          const d = a.findIndex((p) => p.id === t.id);
          let m;
          d >= 0
            ? (m = a.map((p, f) => (f === d ? { ...p, hasLiveDemo: o } : p)))
            : (m = [
                {
                  id: t.id,
                  storeId: l,
                  name: t.name,
                  category: t.category,
                  costPrice: Math.round(t.price * 0.75),
                  sellingPrice: t.price,
                  originalPrice: t.originalPrice,
                  stock: t.stock,
                  unit: "pièce",
                  keywords: [t.name.toLowerCase()],
                  photoUrl: t.image,
                  description: t.description,
                  badge: t.badge,
                  hasLiveDemo: o,
                },
                ...a,
              ]);
          try {
            localStorage.setItem(
              `nana_tenant_${l}_custom_store_products`,
              JSON.stringify(m),
            );
          } catch {}
          return m;
        }),
          g &&
            g.id === t.id &&
            le((a) => (a ? { ...a, hasLiveDemo: o } : null)));
        try {
          const a = ne(ee, "tenants", l, "inventory", t.id);
          ve(a, { hasLiveDemo: o }, { merge: !0 }).catch(() => {});
        } catch {}
        b(
          o
            ? `🔴 Live activé sur "${t.name}"`
            : `⚪ Live retiré de "${t.name}"`,
        );
      },
      [l, g, b],
    );
    const Z = r.useMemo(() => {
        const t = new Set(Rt),
          s = new Set(),
          o = [];
        return (
          st.forEach((a) => {
            a &&
              a.id &&
              !t.has(a.id) &&
              !s.has(a.id) &&
              (s.add(a.id), o.push(a));
          }),
          (h || []).forEach((a) => {
            a &&
              a.id &&
              !t.has(a.id) &&
              !s.has(a.id) &&
              (s.add(a.id), o.push(a));
          }),
          o.length > 0
            ? o.map((a, d) => ({
                id: a.id || `inv-${d}`,
                name: a.name,
                price: a.sellingPrice || a.price || 1e3,
                originalPrice:
                  a.originalPrice ||
                  (a.sellingPrice ? Math.round(a.sellingPrice * 1.15) : void 0),
                category: a.category || "Alimentation",
                image: a.photoUrl || a.imageUrl || wt[d % wt.length].image,
                stock: a.stock ?? a.stockQuantity ?? 15,
                description:
                  a.description ||
                  `Produit authentique disponible chez ${n.storeName}. Contrôle fraîcheur et emballage soigné.`,
                badge:
                  a.badge ||
                  ((a.stock ?? 15) < 5
                    ? "Stock Limité"
                    : d % 3 === 0
                      ? "Top Vente"
                      : void 0),
                hasLiveDemo: !!a.hasLiveDemo,
              }))
            : wt
                .filter((a) => !t.has(a.id))
                .map((a) => ({ ...a, hasLiveDemo: !!a.hasLiveDemo }))
        );
      }, [h, st, Rt, n.storeName]),
      Ye = r.useMemo(() => Z.slice(0, 10), [Z]),
      Ys = r.useMemo(() => Ye.slice(0, 5), [Ye]),
      Hs = r.useMemo(() => Ye.slice(5, 10), [Ye]);
    Math.max(Ys.length, Hs.length);
    const Ks = r.useMemo(() => {
      const t = new Set();
      return (
        Z.forEach((s) => {
          s.category && t.add(s.category);
        }),
        ["TOUS", ...Array.from(t)]
      );
    }, [Z]);
    r.useMemo(() => {
      const t = (Pt || $e).trim().toLowerCase();
      return Z.filter((s) => {
        const o =
            tt === "TOUS" || s.category.toLowerCase() === tt.toLowerCase(),
          a =
            !t ||
            s.name.toLowerCase().includes(t) ||
            s.category.toLowerCase().includes(t);
        return o && a;
      });
    }, [Z, tt, Pt, $e]);
    const Qs = (t, s) => {
      (nt((o) =>
        o.find((d) => d.product.id === t.id)
          ? o.map((d) =>
              d.product.id === t.id ? { ...d, quantity: d.quantity + s } : d,
            )
          : [...o, { product: t, quantity: s }],
      ),
        cs("AddToCart", {
          storeName: n.storeName,
          productName: t.name,
          value: t.price * s,
        }),
        b(`"${t.name}" ajouté au panier !`));
    };
    (he.reduce((t, s) => t + s.quantity, 0),
      he.reduce((t, s) => t + s.product.price * s.quantity, 0));
    const I = r.useMemo(() => (Be && Be.length > 0 ? Be : he), [Be, he]),
      Ae = r.useMemo(() => I.reduce((t, s) => t + s.quantity, 0), [I]),
      He = r.useMemo(
        () => I.reduce((t, s) => t + s.product.price * s.quantity, 0),
        [I],
      ),
      Xs = (t, s = 1) => {
        (u(), Ve([{ product: t, quantity: s }]), pe(!0));
      },
      zt = async (t) => {
        oe();
        const s = q?.orderId || `CMD-${Math.floor(1e5 + Math.random() * 9e5)}`,
          o = q?.items || I,
          a = t.amount || q?.total || He,
          d = t.operator?.id === "cod",
          m = d
            ? "Paiement à la livraison (Espèces)"
            : `Mobile Money (${t.operator?.name || "Mobile Money"}) - Réf: ${t.transactionId}`,
          p = {
            id: `order-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
            storeId: l,
            orderNumber: s,
            date: new Date().toLocaleDateString("fr-FR"),
            createdAt: Date.now(),
            createdAtFormatted: new Date().toLocaleString("fr-FR", {
              dateStyle: "short",
              timeStyle: "short",
            }),
            timestamp: Date.now(),
            type: "BON_COMMANDE",
            customerName: de.trim() || "Client Vitrine",
            customerPhone: t.phoneNumber || fe.trim() || "Non renseigné",
            deliveryAddress:
              t.deliveryAddress || me.trim() || "Adresse non renseignée",
            customerAddress:
              t.deliveryAddress || me.trim() || "Adresse non renseignée",
            customerEmail: be.trim() || void 0,
            items: o.map((f) => ({
              id: f.product.id,
              productId: f.product.id,
              name: f.product.name,
              price: f.product.price,
              quantity: f.quantity,
              category: "BOUTIQUE_WEB",
              unitPrice: f.product.price,
              total: f.product.price * f.quantity,
            })),
            subtotal: a,
            discount: 0,
            total: a,
            totalAmount: a,
            depositAmount: d ? 0 : a,
            remainingBalance: d ? a : 0,
            status: d ? "EN_ATTENTE" : "PAYE",
            paymentStatus: d
              ? "À ENCAISSER À LA LIVRAISON"
              : `PAYÉ (Mobile Money - ${t.operator?.name || "Mobile Money"})`,
            deliveryStatus: "Nouvelle commande",
            paymentMethod: d ? "CASH" : "MOBILE_MONEY",
            paymentOperator:
              t.operator?.name || (d ? "Espèces" : "Mobile Money"),
            transactionId: t.transactionId,
            notes: d
              ? `Commande Vitrine • Paiement à la livraison (Espèces) • Réf: ${t.transactionId} • Client: ${de.trim()}`
              : `Commande Vitrine • Payé via Passerelle Sécurisée Sebpay (${t.operator?.name}) • Réf: ${t.transactionId}`,
          };
        try {
          await ga(p, l);
        } catch (f) {
          console.warn("Erreur sauvegarde commande universelle :", f);
        }
        for (const f of o) {
          ce((R) => {
            const L = R.map((F) => {
              if (F.id === f.product.id) {
                const B = F.stock || 0,
                  Q = Math.max(0, B - f.quantity);
                return { ...F, stock: Q };
              }
              return F;
            });
            try {
              localStorage.setItem(
                `nana_tenant_${l}_custom_store_products`,
                JSON.stringify(L),
              );
            } catch {}
            return L;
          });
          try {
            const R = ne(ee, "stores", l, "products", f.product.id),
              L = f.product.stock || 0,
              F = Math.max(0, L - f.quantity);
            await ve(R, { stock: F }, { merge: !0 });
          } catch {}
          if (_) {
            const R = h?.find((L) => L.id === f.product.id);
            R && _({ ...R, stock: Math.max(0, (R.stock || 0) - f.quantity) });
          }
        }
        (nt([]),
          Ve(null),
          rt(!1),
          pe(!1),
          At({
            orderNumber: s,
            total: a,
            paymentMethod: m,
            createdAt: new Date().toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
            }),
          }),
          b(
            d
              ? "📦 Commande enregistrée pour livraison !"
              : "🎉 Paiement validé avec succès par Nanasore Pay !",
          ));
      },
      Zs = async () => {
        if (!T) {
          console.warn(
            "[RBAC GUARD] Sauvegarde de boutique non autorisée pour un visiteur public",
          );
          return;
        }
        (u(), _t(!0));
        try {
          const t = ne(ee, "stores", l),
            s = {
              ...n,
              active_theme_id: n.active_theme_id || "theme-default",
              theme: W,
              storeId: l,
              updatedAt: new Date().toISOString(),
            };
          if (
            (localStorage.setItem(
              `nana_tenant_${l}_store_config`,
              JSON.stringify({ ...n, theme: W }),
            ),
            localStorage.setItem(
              "nana_store_hub_config",
              JSON.stringify({ ...n, theme: W }),
            ),
            localStorage.setItem(`nana_boutique_theme_${l}`, W),
            await ve(t, s, { merge: !0 }),
            n.customDomain && n.customDomain.trim())
          )
            try {
              await ba(l, n.customDomain, {
                storeName: n.storeName,
                logoUrl: n.logoUrl,
                theme: W,
                whatsappPhone: n.whatsappPhone,
                welcomeText: n.welcomeText,
              });
            } catch (o) {
              console.warn(
                "[WHITE-LABEL] Avertissement synchro domaine tenant:",
                o,
              );
            }
          (oe(),
            Ue(!0),
            b("Vitrine en ligne enregistrée avec succès !"),
            setTimeout(() => Ue(!1), 2500));
        } catch (t) {
          (console.warn("Sauvegarde locale appliquée :", t?.message || t),
            localStorage.setItem(
              `nana_tenant_${l}_store_config`,
              JSON.stringify(n),
            ),
            oe(),
            Ue(!0),
            b("Boutique sauvegardée localement"),
            setTimeout(() => Ue(!1), 2500));
        } finally {
          _t(!1);
        }
      },
      Gt = (t, s, o) => {
        if ((o && o.stopPropagation(), !ar(Fs, l))) {
          console.warn(
            "[RBAC GUARD] Suppression de produit non autorisée pour un visiteur public",
          );
          return;
        }
        (fa(),
          Rs((a) => {
            if (a.includes(t)) return a;
            const d = [...a, t];
            try {
              localStorage.setItem(
                `nana_tenant_${l}_removed_products`,
                JSON.stringify(d),
              );
            } catch {}
            return d;
          }),
          ce((a) => {
            const d = a.filter((m) => m.id !== t);
            try {
              localStorage.setItem(
                `nana_tenant_${l}_custom_store_products`,
                JSON.stringify(d),
              );
            } catch {}
            return d;
          }),
          nt((a) => a.filter((d) => d.product.id !== t)),
          g && g.id === t && le(null),
          b(`Produit "${s}" retiré de la boutique`));
      },
      we = r.useMemo(
        () => (n.slug || n.storeName || l).replace(/^store-/, ""),
        [n.slug, n.storeName, l],
      ),
      Ke = r.useMemo(
        () => n.active_theme_id || n.activeThemeId || "theme-default",
        [n.active_theme_id, n.activeThemeId],
      ),
      Ee = r.useMemo(
        () =>
          n.customDomain && n.customDomain.trim()
            ? `https://${n.customDomain.trim().replace(/^https?:\/\//, "")}`
            : buildPublicShopUrl(we, { themeId: Ke }),
        [n.customDomain, we, Ke],
      ),
      ea = (t) =>
        n.customDomain && n.customDomain.trim()
          ? `${`https://${n.customDomain.trim().replace(/^https?:\/\//, "")}`}/p/${encodeURIComponent(t.slug || t.productSlug || (t.name ? ms(t.name) : t.id))}`
          : buildPublicShopUrl(we, {
              themeId: Ke,
              productSlug:
                t.slug || t.productSlug || (t.name ? ms(t.name) : t.id),
            }),
      ta = async (t, s) => {
        (s && s.stopPropagation(), u());
        const o = ea(t);
        if (typeof navigator < "u" && typeof navigator.share == "function")
          try {
            await navigator.share({ title: t.name, url: o });
            return;
          } catch {}
        try {
          if (navigator.clipboard && navigator.clipboard.writeText) {
            (await navigator.clipboard.writeText(o),
              b(`🔗 Lien de "${t.name}" copié !`));
            return;
          }
        } catch (a) {
          console.warn("Clipboard non disponible :", a);
        }
        b(`Lien produit : ${o}`);
      },
      sa = async () => {
        u();
        const t =
          Ee ||
          (typeof window < "u" ? window.location.href : "https://nanasore.com");
        try {
          if (navigator.clipboard && navigator.clipboard.writeText)
            await navigator.clipboard.writeText(t);
          else {
            const s = document.createElement("textarea");
            ((s.value = t),
              document.body.appendChild(s),
              s.select(),
              document.execCommand("copy"),
              document.body.removeChild(s));
          }
          (Tt(!0),
            b("Lien de votre boutique copié !"),
            setTimeout(() => Tt(!1), 2e3));
        } catch (s) {
          (console.warn("Clipboard non disponible :", s),
            b(`Lien boutique : ${t}`));
        }
      };
    r.useEffect(() => {
      let t = G;
      if (!t && typeof window < "u") {
        const s = window.location.pathname.match(
          /\/(?:p|produit|produits)\/([^/?#]+)/i,
        );
        if (s) t = decodeURIComponent(s[1]);
        else {
          const o = new URLSearchParams(window.location.search);
          t = o.get("produit") || o.get("product") || o.get("id");
        }
      }
      if (t && Array.isArray(Z) && Z.length > 0) {
        const s = Z.find((o) => o.id === t);
        s && le(s);
      }
    }, [G, Z]);
    const [aa, gr] = r.useState(!1);
    return e.jsxs("div", {
      className:
        "min-h-screen flex flex-col bg-slate-950 text-body font-sans select-none",
      children: [
        !N &&
          T &&
          e.jsxs(e.Fragment, {
            children: [
              e.jsx("input", {
                type: "file",
                ref: Ct,
                accept: "image/*",
                className: "hidden",
                onChange: zs,
              }),
              e.jsx("input", {
                type: "file",
                ref: js,
                accept: "image/*",
                className: "hidden",
                onChange: (t) => Ut(t, "banner"),
              }),
              e.jsx("input", {
                type: "file",
                ref: Ss,
                accept: "image/*",
                className: "hidden",
                onChange: (t) => Ut(t, "promo"),
              }),
            ],
          }),
        K &&
          e.jsxs("div", {
            className:
              "fixed top-16 right-4 z-50 bg-emerald-600 text-white text-xs font-black px-4 py-2.5 rounded-2xl shadow-2xl flex items-center gap-2 border border-emerald-400 animate-in fade-in slide-in-from-top-4 duration-200",
            children: [
              e.jsx(ue, { className: "w-4 h-4 text-emerald-200" }),
              e.jsx("span", { children: K }),
            ],
          }),
        e.jsxs("header", {
          className:
            "sticky top-0 z-40 bg-slate-950/95 border-b border-slate-800 text-white backdrop-blur-xl px-4 sm:px-6 py-3 flex items-center justify-between gap-3 shadow-md",
          children: [
            e.jsxs("div", {
              className: "flex items-center gap-2 sm:gap-3 min-w-0",
              children: [
                e.jsxs("button", {
                  type: "button",
                  onClick: je,
                  className:
                    "px-2.5 sm:px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white transition cursor-pointer flex items-center gap-1.5 text-xs font-black shrink-0 shadow-md shadow-emerald-950/40",
                  title: "Retour à la Caisse Tactile",
                  children: [
                    e.jsx(Zt, { className: "w-4 h-4" }),
                    e.jsx("span", { children: "Caisse" }),
                  ],
                }),
                e.jsxs("button", {
                  type: "button",
                  onClick: Se,
                  className:
                    "px-2.5 sm:px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 active:scale-95 text-white transition cursor-pointer flex items-center gap-1.5 text-xs font-black shrink-0 shadow-md shadow-blue-950/40",
                  title: "Retour au Hub Master",
                  children: [
                    e.jsx(Zt, { className: "w-4 h-4" }),
                    e.jsx("span", {
                      className: "hidden sm:inline",
                      children: "Hub Master",
                    }),
                    e.jsx("span", { className: "sm:hidden", children: "Hub" }),
                  ],
                }),
                e.jsxs("div", {
                  className: "flex items-center gap-2 min-w-0 ml-1",
                  children: [
                    e.jsx("span", {
                      className:
                        "font-bold text-sm text-white truncate max-w-[140px] sm:max-w-xs",
                      children: n.storeName || "Mon Espace Vendeur",
                    }),
                    e.jsxs("span", {
                      className:
                        "hidden md:inline-flex items-center gap-1 bg-emerald-500/20 text-emerald-400 text-[10px] font-black px-2 py-0.5 rounded-full border border-emerald-500/40 shrink-0",
                      children: [
                        e.jsx(Ne, { className: "w-3 h-3 text-emerald-400" }),
                        e.jsx("span", { children: "CERTIFIÉE ✓" }),
                      ],
                    }),
                  ],
                }),
              ],
            }),
            e.jsxs("div", {
              className: "flex items-center gap-2 shrink-0",
              children: [
                e.jsxs("button", {
                  type: "button",
                  onClick: () => {
                    (u(), ut(!0));
                  },
                  className:
                    "relative flex items-center gap-1.5 bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-700 active:scale-95 px-3 py-1.5 rounded-xl font-bold text-xs transition cursor-pointer shrink-0",
                  title: "Commandes reçues",
                  children: [
                    e.jsx(Te, { className: "w-3.5 h-3.5 text-rose-400" }),
                    e.jsx("span", {
                      className: "hidden sm:inline",
                      children: "Commandes",
                    }),
                    Je > 0 &&
                      e.jsx("span", {
                        className:
                          "px-1.5 py-0.2 rounded-full bg-rose-600 text-white text-[10px] font-black animate-pulse leading-none",
                        children: Je,
                      }),
                  ],
                }),
                e.jsxs("button", {
                  type: "button",
                  onClick: () => {
                    (u(), Ce(!0));
                  },
                  className:
                    "flex items-center gap-1.5 bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-700 active:scale-95 px-2.5 sm:px-3 py-1.5 rounded-xl font-bold text-xs transition cursor-pointer shrink-0",
                  title: "Paramètres de la boutique",
                  children: [
                    e.jsx(es, { className: "w-3.5 h-3.5 text-amber-400" }),
                    e.jsx("span", {
                      className: "hidden md:inline",
                      children: "Paramètres",
                    }),
                  ],
                }),
                e.jsxs("button", {
                  type: "button",
                  onClick: ie,
                  className:
                    "flex items-center gap-1.5 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white active:scale-95 px-3.5 py-1.5 rounded-xl font-black text-xs transition shadow-md shadow-indigo-600/30 cursor-pointer shrink-0",
                  title: "Ouvrir le Nanasore Theme Studio",
                  children: [
                    e.jsx(Nt, { className: "w-3.5 h-3.5 text-indigo-200" }),
                    e.jsx("span", {
                      className: "hidden sm:inline",
                      children: "🎨 Nanasore Studio",
                    }),
                    e.jsx("span", {
                      className: "sm:hidden",
                      children: "Studio",
                    }),
                  ],
                }),
              ],
            }),
          ],
        }),
        e.jsxs("main", {
          className: "flex-1 max-w-6xl w-full mx-auto p-4 sm:p-6 space-y-6",
          children: [
            e.jsxs("div", {
              className:
                "relative rounded-3xl overflow-hidden bg-gradient-to-br from-indigo-950/90 via-slate-900 to-purple-950/80 border border-indigo-500/40 p-6 sm:p-8 shadow-2xl flex flex-col md:flex-row items-start md:items-center justify-between gap-6",
              children: [
                e.jsxs("div", {
                  className: "space-y-2 max-w-xl",
                  children: [
                    e.jsxs("div", {
                      className:
                        "inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 text-xs font-black",
                      children: [
                        e.jsx(ps, { className: "w-3.5 h-3.5" }),
                        e.jsx("span", { children: "NANASORE STUDIO 2026" }),
                      ],
                    }),
                    e.jsx("h2", {
                      className:
                        "text-xl sm:text-2xl font-black text-white tracking-tight",
                      children:
                        "Personnalisez votre boutique & vos thèmes en direct",
                    }),
                    e.jsx("p", {
                      className:
                        "text-xs sm:text-sm text-slate-300 leading-relaxed",
                      children:
                        "Theme Editor complet style Shopify Moderne. 6 thèmes ultra-premium (Émeraude Prestige, Studio Live, Electro Orange, Mega-Store Pro...), conteneur 100% neutre et simulateur iPhone en temps réel.",
                    }),
                    e.jsxs("div", {
                      className: "flex items-center gap-3 pt-2",
                      children: [
                        e.jsx("span", {
                          className: "text-xs text-slate-400",
                          children: "Thème actuellement actif :",
                        }),
                        e.jsxs("span", {
                          className:
                            "bg-slate-800 text-indigo-300 text-xs px-3 py-1 rounded-full border border-indigo-500/30 font-bold",
                          children: [
                            "🎨 ",
                            Ke === "theme-beauty-emerald"
                              ? "Émeraude Prestige"
                              : Ke === "theme-livestream-pro"
                                ? "Studio Live Pro"
                                : Ke === "theme-electro-orange"
                                  ? "Electro Orange"
                                  : Ke === "theme-mega-store-pro"
                                    ? "Mega-Store Pro"
                                    : "Standard Élite",
                          ],
                        }),
                      ],
                    }),
                  ],
                }),
                e.jsx("div", {
                  className:
                    "flex flex-col sm:flex-row items-center gap-3 shrink-0 w-full md:w-auto",
                  children: e.jsxs("button", {
                    type: "button",
                    onClick: ie,
                    className:
                      "w-full sm:w-auto bg-gradient-to-r from-indigo-600 via-indigo-500 to-purple-600 hover:from-indigo-500 hover:to-purple-500 active:scale-95 text-white font-black text-sm px-6 py-4 rounded-2xl shadow-xl shadow-indigo-600/40 flex items-center justify-center gap-2.5 transition cursor-pointer",
                    children: [
                      e.jsx(Nt, { className: "w-5 h-5 text-indigo-200" }),
                      e.jsx("span", {
                        children: "🎨 Ouvrir Nanasore Studio →",
                      }),
                    ],
                  }),
                }),
              ],
            }),
            e.jsxs("div", {
              className:
                "relative rounded-3xl overflow-hidden bg-gradient-to-r from-blue-600 via-blue-700 to-indigo-900 border-2 border-blue-400/40 p-6 sm:p-7 shadow-xl shadow-blue-600/20 flex flex-col md:flex-row items-start md:items-center justify-between gap-6 text-white",
              children: [
                e.jsxs("div", {
                  className: "space-y-2 max-w-xl",
                  children: [
                    e.jsxs("div", {
                      className:
                        "inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/15 backdrop-blur-md border border-white/20 text-xs font-black text-blue-100",
                      children: [
                        e.jsx(ts, { className: "w-3.5 h-3.5 text-blue-200" }),
                        e.jsx("span", {
                          children: "NANASWITCH CLOUD • ROUTEUR API MULTI-PAYS",
                        }),
                      ],
                    }),
                    e.jsx("h2", {
                      className:
                        "text-xl sm:text-2xl font-black text-white tracking-tight",
                      children:
                        "🌐 NaNaSwitch Cloud (Routeur API Multi-Pays & Failover 0ms)",
                    }),
                    e.jsx("p", {
                      className:
                        "text-xs sm:text-sm text-blue-100/90 leading-relaxed",
                      children:
                        "Connectez vos propres clés d'API (SebPay, CinetPay, PayDunya, Stripe, FedaPay), aiguillez automatiquement vos clients par pays et basculez instantanément en cas de panne opérateur sans perdre une seule vente.",
                    }),
                  ],
                }),
                e.jsx("div", {
                  className:
                    "flex flex-col sm:flex-row items-center gap-3 shrink-0 w-full md:w-auto",
                  children: e.jsxs("button", {
                    type: "button",
                    onClick: () => {
                      (u(),
                        typeof window < "u" &&
                          (window.location.href = "/nana-switch/overview"));
                    },
                    className:
                      "w-full sm:w-auto bg-white hover:bg-blue-50 active:scale-95 text-blue-700 font-black text-sm px-6 py-4 rounded-2xl shadow-xl flex items-center justify-center gap-2.5 transition cursor-pointer",
                    children: [
                      e.jsx(Xe, {
                        className: "w-5 h-5 text-blue-600 fill-blue-600",
                      }),
                      e.jsx("span", { children: "Ouvrir NaNaSwitch Cloud →" }),
                    ],
                  }),
                }),
              ],
            }),
            se !== "verified" && !isSuperAdminLocally(c)
              ? e.jsxs("div", {
                  className:
                    "bg-gradient-to-r from-slate-900 via-amber-950/60 to-slate-900 border border-amber-500/40 rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-lg",
                  children: [
                    e.jsxs("div", {
                      className: "flex items-start gap-3.5",
                      children: [
                        e.jsx("div", {
                          className:
                            "w-10 h-10 rounded-2xl bg-amber-500/20 text-amber-400 border border-amber-500/40 flex items-center justify-center shrink-0 mt-0.5",
                          children: e.jsx(Ne, { className: "w-5 h-5" }),
                        }),
                        e.jsxs("div", {
                          className: "space-y-0.5",
                          children: [
                            e.jsxs("h3", {
                              className:
                                "text-sm font-black text-amber-200 flex items-center gap-2",
                              children: [
                                "Vérification d'identité Vendeur (KYC)",
                                e.jsx("span", {
                                  className:
                                    "text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40",
                                  children:
                                    se === "pending_approval"
                                      ? "EN ATTENTE"
                                      : "ACTION REQUISE",
                                }),
                              ],
                            }),
                            e.jsx("p", {
                              className:
                                "text-xs text-slate-300 leading-relaxed",
                              children:
                                se === "pending_approval"
                                  ? "Votre dossier est en cours d'examen par notre équipe sous 24h."
                                  : "Validez votre pièce officielle pour débloquer les retraits sans limite et obtenir le badge certifié.",
                            }),
                          ],
                        }),
                      ],
                    }),
                    e.jsx("button", {
                      type: "button",
                      onClick: () => {
                        (u(), Ie(!0));
                      },
                      className:
                        "bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs px-4 py-2.5 rounded-xl shadow-md transition active:scale-95 cursor-pointer shrink-0",
                      children:
                        se === "pending_approval"
                          ? "Consulter mon dossier"
                          : "Démarrer vérification KYC →",
                    }),
                  ],
                })
              : e.jsxs("div", {
                  className:
                    "bg-gradient-to-r from-emerald-950/40 via-slate-900 to-teal-950/40 border border-emerald-500/30 rounded-2xl px-5 py-3.5 flex items-center justify-between",
                  children: [
                    e.jsxs("div", {
                      className: "flex items-center gap-3",
                      children: [
                        e.jsx(Ne, { className: "w-5 h-5 text-emerald-400" }),
                        e.jsxs("div", {
                          children: [
                            e.jsx("span", {
                              className: "text-xs font-bold text-emerald-300",
                              children:
                                "Boutique Officiellement Certifiée ✓ (Palier 2 Actif)",
                            }),
                            e.jsx("p", {
                              className: "text-[11px] text-slate-400",
                              children:
                                "Paiements en ligne, retraits Wave/Orange Money et Pixels Meta opérationnels.",
                            }),
                          ],
                        }),
                      ],
                    }),
                    e.jsx("span", {
                      className:
                        "text-xs font-bold text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-full border border-emerald-500/30",
                      children: "Vérifié ✓",
                    }),
                  ],
                }),
            e.jsxs("div", {
              className: "grid grid-cols-2 lg:grid-cols-4 gap-4",
              children: [
                e.jsxs("div", {
                  className:
                    "bg-slate-900 border border-slate-800 rounded-2xl p-4.5 space-y-1",
                  children: [
                    e.jsxs("div", {
                      className:
                        "flex items-center justify-between text-slate-400 text-xs font-medium",
                      children: [
                        e.jsx("span", { children: "Chiffre d'affaires" }),
                        e.jsx(Ca, { className: "w-4 h-4 text-emerald-400" }),
                      ],
                    }),
                    e.jsx("div", {
                      className: "text-lg sm:text-xl font-black text-white",
                      children: z(Et),
                    }),
                    e.jsxs("span", {
                      className: "text-[10px] text-emerald-400 font-bold",
                      children: [
                        x.length,
                        " vente",
                        x.length > 1 ? "s" : "",
                        " enregistrée",
                        x.length > 1 ? "s" : "",
                      ],
                    }),
                  ],
                }),
                e.jsxs("div", {
                  className:
                    "bg-slate-900 border border-slate-800 rounded-2xl p-4.5 space-y-1",
                  children: [
                    e.jsxs("div", {
                      className:
                        "flex items-center justify-between text-slate-400 text-xs font-medium",
                      children: [
                        e.jsx("span", { children: "Commandes Web" }),
                        e.jsx(Te, { className: "w-4 h-4 text-rose-400" }),
                      ],
                    }),
                    e.jsx("div", {
                      className: "text-lg sm:text-xl font-black text-white",
                      children: Ge.length,
                    }),
                    e.jsxs("span", {
                      className: "text-[10px] text-slate-400 font-medium",
                      children: [Je, " nouvelle", Je > 1 ? "s" : ""],
                    }),
                  ],
                }),
                e.jsxs("div", {
                  className:
                    "bg-slate-900 border border-slate-800 rounded-2xl p-4.5 space-y-1",
                  children: [
                    e.jsxs("div", {
                      className:
                        "flex items-center justify-between text-slate-400 text-xs font-medium",
                      children: [
                        e.jsx("span", { children: "Catalogue Produits" }),
                        e.jsx(gt, { className: "w-4 h-4 text-indigo-400" }),
                      ],
                    }),
                    e.jsx("div", {
                      className: "text-lg sm:text-xl font-black text-white",
                      children: h.length,
                    }),
                    e.jsx("span", {
                      className: "text-[10px] text-indigo-300 font-medium",
                      children: "Articles au catalogue",
                    }),
                  ],
                }),
                e.jsxs("div", {
                  className:
                    "bg-slate-900 border border-slate-800 rounded-2xl p-4.5 space-y-1",
                  children: [
                    e.jsxs("div", {
                      className:
                        "flex items-center justify-between text-slate-400 text-xs font-medium",
                      children: [
                        e.jsx("span", { children: "Solde Disponible" }),
                        e.jsx(Pa, { className: "w-4 h-4 text-amber-400" }),
                      ],
                    }),
                    e.jsx("div", {
                      className: "text-lg sm:text-xl font-black text-amber-300",
                      children: z(Et),
                    }),
                    e.jsx("span", {
                      className: "text-[10px] text-slate-400",
                      children: "Retraits instantanés",
                    }),
                  ],
                }),
              ],
            }),
            e.jsxs("div", {
              className:
                "bg-slate-900 border border-slate-800 rounded-3xl p-5 sm:p-6 space-y-4",
              children: [
                e.jsxs("div", {
                  className:
                    "flex items-center justify-between flex-wrap gap-3",
                  children: [
                    e.jsxs("div", {
                      children: [
                        e.jsxs("h3", {
                          className:
                            "text-base font-black text-white flex items-center gap-2",
                          children: [
                            e.jsx(gt, {
                              className: "w-5 h-5 text-emerald-400",
                            }),
                            "Catalogue Produits (",
                            h.length,
                            " article",
                            h.length > 1 ? "s" : "",
                            ")",
                          ],
                        }),
                        e.jsx("p", {
                          className: "text-xs text-slate-400",
                          children:
                            "Gérez vos articles, vos prix et vos stocks.",
                        }),
                      ],
                    }),
                    e.jsxs("button", {
                      type: "button",
                      onClick: () => {
                        (u(), Fe(null), qe(!0));
                      },
                      className:
                        "bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white font-bold text-xs px-4 py-2.5 rounded-xl shadow-md flex items-center gap-2 transition cursor-pointer",
                      children: [
                        e.jsx(ss, { className: "w-4 h-4" }),
                        e.jsx("span", { children: "➕ Nouveau Produit" }),
                      ],
                    }),
                  ],
                }),
                h.length === 0
                  ? e.jsxs("div", {
                      className:
                        "text-center py-10 bg-slate-950/50 rounded-2xl border border-slate-800 space-y-3",
                      children: [
                        e.jsx(gt, {
                          className: "w-10 h-10 text-slate-600 mx-auto",
                        }),
                        e.jsx("p", {
                          className: "text-xs text-slate-400",
                          children: "Votre catalogue est encore vide.",
                        }),
                        e.jsxs("button", {
                          type: "button",
                          onClick: () => {
                            (u(), Fe(null), qe(!0));
                          },
                          className:
                            "bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs px-4 py-2 rounded-xl transition cursor-pointer inline-flex items-center gap-1.5",
                          children: [
                            e.jsx(ss, { className: "w-3.5 h-3.5" }),
                            e.jsx("span", {
                              children: "Ajouter mon premier produit",
                            }),
                          ],
                        }),
                      ],
                    })
                  : e.jsx("div", {
                      className:
                        "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5 pt-2",
                      children: h.map((t) =>
                        e.jsxs(
                          "div",
                          {
                            className:
                              "p-3 bg-slate-950/70 border border-slate-800 rounded-2xl flex items-center gap-3 group hover:border-slate-700 transition",
                            children: [
                              e.jsx("img", {
                                src:
                                  t.imageUrl ||
                                  "https://images.unsplash.com/photo-1542838132-92c53300491e?w=200&auto=format&fit=crop&q=80",
                                alt: t.name,
                                className:
                                  "w-14 h-14 rounded-xl object-cover shrink-0 border border-slate-800",
                              }),
                              e.jsxs("div", {
                                className: "min-w-0 flex-1",
                                children: [
                                  e.jsx("h4", {
                                    className:
                                      "font-bold text-xs text-white truncate",
                                    children: t.name,
                                  }),
                                  e.jsx("p", {
                                    className:
                                      "text-xs font-black text-emerald-400 mt-0.5",
                                    children: z(t.salePrice || t.price || 0),
                                  }),
                                  e.jsxs("span", {
                                    className:
                                      "text-[10px] text-slate-400 font-medium",
                                    children: [
                                      "Stock: ",
                                      t.currentStock || t.stock || 0,
                                    ],
                                  }),
                                ],
                              }),
                              e.jsxs("div", {
                                className: "flex items-center gap-1 shrink-0",
                                children: [
                                  e.jsx("button", {
                                    type: "button",
                                    onClick: () => {
                                      (u(), Wt(t));
                                    },
                                    className:
                                      "p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer",
                                    title: "Modifier",
                                    children: e.jsx(as, {
                                      className: "w-3.5 h-3.5 text-indigo-400",
                                    }),
                                  }),
                                  e.jsx("button", {
                                    type: "button",
                                    onClick: (s) => Gt(t.id, t.name, s),
                                    className:
                                      "p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-950/40 transition cursor-pointer",
                                    title: "Supprimer",
                                    children: e.jsx(xs, {
                                      className: "w-3.5 h-3.5",
                                    }),
                                  }),
                                ],
                              }),
                            ],
                          },
                          t.id,
                        ),
                      ),
                    }),
              ],
            }),
            e.jsxs("div", {
              className:
                "bg-slate-900 border border-slate-800 rounded-2xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3",
              children: [
                e.jsxs("div", {
                  className: "flex items-center gap-3",
                  children: [
                    e.jsx(ts, {
                      className: "w-5 h-5 text-emerald-400 shrink-0",
                    }),
                    e.jsxs("div", {
                      children: [
                        e.jsx("span", {
                          className: "text-xs font-bold text-white",
                          children: "Lien Public de votre Boutique :",
                        }),
                        e.jsxs("p", {
                          className:
                            "text-xs font-mono text-emerald-400 mt-0.5",
                          children: ["nsore.shop/", getThemeRoutePrefix(Ke), "/", we],
                        }),
                      ],
                    }),
                  ],
                }),
                e.jsxs("div", {
                  className: "flex items-center gap-2",
                  children: [
                    e.jsxs("button", {
                      type: "button",
                      onClick: () => {
                        (u(),
                          navigator.clipboard?.writeText(buildPublicShopUrl(we, { themeId: Ke })),
                          b("✅ Lien nsore.shop copié !"));
                      },
                      className:
                        "px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold transition flex items-center gap-1.5 cursor-pointer",
                      children: [
                        e.jsx(rs, { className: "w-3.5 h-3.5" }),
                        e.jsx("span", { children: "Copier le lien" }),
                      ],
                    }),
                    e.jsxs("a", {
                      href: buildPublicShopUrl(we, { themeId: Ke }),
                      target: "_blank",
                      rel: "noopener noreferrer",
                      className:
                        "px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition flex items-center gap-1.5 cursor-pointer",
                      children: [
                        e.jsx(Ia, { className: "w-3.5 h-3.5" }),
                        e.jsx("span", { children: "Voir la boutique" }),
                      ],
                    }),
                  ],
                }),
              ],
            }),
          ],
        }),
        !N &&
          e.jsx(Ba, {
            merchantId: l || c?.storeId || "store-konkobo-telecom",
            storeName: n.storeName,
          }),
        g &&
          e.jsx(qa, {
            product: g,
            storeName: n.storeName,
            whatsappPhone: n.whatsappPhone,
            merchantId: l || c?.storeId || "store-konkobo-telecom",
            onClose: () => le(null),
            onAddToCart: Qs,
            onDirectCheckout: (t, s) => {
              (le(null), Xs(t, s));
            },
            onEditProduct:
              !N && mt
                ? (t) => {
                    (le(null), Wt(t));
                  }
                : void 0,
            onRemoveProduct: !N && Bs ? Gt : void 0,
            onShareProduct: ta,
            onCreateFunnel: Ws,
            isPublicView: N,
            subscription: E,
            currentUser: c,
            theme: W,
          }),
        Ft &&
          $t &&
          e.jsx(Fa, {
            product: $t,
            isOpen: Ft,
            onClose: () => {
              (Bt(!1), qt(null));
            },
            onSave: (t) => {
              try {
                da(t);
              } catch (s) {
                console.warn("Erreur saveFunnelConfig Dashboard:", s);
              }
            },
          }),
        As &&
          !N &&
          T &&
          e.jsx("div", {
            className:
              "fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-3 sm:p-4 backdrop-blur-xs animate-in fade-in duration-200",
            children: e.jsxs("div", {
              className:
                "w-full max-w-md max-h-[85vh] flex flex-col bg-card border border-theme rounded-3xl shadow-2xl relative text-body overflow-hidden",
              children: [
                e.jsxs("div", {
                  className:
                    "flex items-center justify-between border-b border-theme p-4 sm:p-5 shrink-0",
                  children: [
                    e.jsxs("h3", {
                      className:
                        "font-extrabold text-sm text-body flex items-center gap-2",
                      children: [
                        e.jsx(es, { className: "w-4 h-4 text-amber-400" }),
                        "Coordonnées & Informations Boutique",
                      ],
                    }),
                    e.jsx("button", {
                      type: "button",
                      onClick: () => Ce(!1),
                      className:
                        "min-h-[44px] min-w-[44px] flex items-center justify-center p-2 rounded-full bg-secondary text-muted hover:text-body border border-theme cursor-pointer transition touch-manipulation",
                      "aria-label": "Fermer les paramètres",
                      children: e.jsx(Re, { className: "w-4 h-4" }),
                    }),
                  ],
                }),
                e.jsxs("div", {
                  className:
                    "flex-1 overflow-y-auto overscroll-contain p-4 sm:p-5 space-y-4 text-xs",
                  children: [
                    e.jsxs("div", {
                      className:
                        "p-3 bg-secondary border border-theme rounded-2xl flex items-center justify-between gap-3",
                      children: [
                        e.jsxs("div", {
                          className: "flex items-center gap-2.5",
                          children: [
                            n.logoUrl
                              ? e.jsx("img", {
                                  src: n.logoUrl,
                                  alt: "Logo",
                                  loading: "lazy",
                                  decoding: "async",
                                  className:
                                    "w-12 h-12 rounded-2xl object-cover border-2 border-emerald-400 shadow-md",
                                })
                              : e.jsx("div", {
                                  className:
                                    "w-12 h-12 rounded-2xl bg-gradient-to-tr from-emerald-500 to-teal-400 flex items-center justify-center text-slate-950 font-black",
                                  children: e.jsx(Aa, { className: "w-6 h-6" }),
                                }),
                            e.jsxs("div", {
                              children: [
                                e.jsx("h4", {
                                  className: "font-extrabold text-body text-xs",
                                  children: "Logo / Enseigne Boutique",
                                }),
                                e.jsx("p", {
                                  className: "text-[10px] text-muted",
                                  children:
                                    "Format carré, compressé automatiquement",
                                }),
                              ],
                            }),
                          ],
                        }),
                        e.jsxs("button", {
                          type: "button",
                          onClick: () => {
                            (u(), Ct.current?.click());
                          },
                          className:
                            "bg-card hover:bg-card-hover text-emerald-500 border border-theme font-bold text-xs px-3 py-2 rounded-xl flex items-center gap-1.5 shadow-sm cursor-pointer transition",
                          children: [
                            e.jsx(Ea, { className: "w-3.5 h-3.5" }),
                            e.jsx("span", { children: "Changer" }),
                          ],
                        }),
                      ],
                    }),
                    e.jsxs("div", {
                      className:
                        "p-3.5 bg-secondary border border-theme rounded-2xl space-y-2.5",
                      children: [
                        e.jsx("div", {
                          className: "flex items-center justify-between",
                          children: e.jsxs("div", {
                            className: "flex items-center gap-2",
                            children: [
                              e.jsx("div", {
                                className:
                                  "w-7 h-7 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center font-bold",
                                children:
                                  W === "light"
                                    ? e.jsx(ns, {
                                        className: "w-4 h-4 text-amber-400",
                                      })
                                    : W === "blue"
                                      ? e.jsx(os, {
                                          className: "w-4 h-4 text-sky-400",
                                        })
                                      : e.jsx(is, {
                                          className: "w-4 h-4 text-indigo-400",
                                        }),
                              }),
                              e.jsxs("div", {
                                children: [
                                  e.jsx("h4", {
                                    className:
                                      "font-extrabold text-body text-xs",
                                    children: "Thème & Ambiance de la Boutique",
                                  }),
                                  e.jsx("p", {
                                    className: "text-[10px] text-muted",
                                    children:
                                      "Sombre, Blanc Pur ou Pur Bleu (Brand Tech)",
                                  }),
                                ],
                              }),
                            ],
                          }),
                        }),
                        e.jsxs("div", {
                          className:
                            "grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1",
                          children: [
                            e.jsxs("button", {
                              type: "button",
                              onClick: () => Ze("dark"),
                              className: `p-2.5 rounded-xl border flex flex-col items-center gap-1.5 transition text-left cursor-pointer ${W === "dark" ? "bg-card border-emerald-500 ring-2 ring-emerald-500/30 text-body shadow-xs" : "bg-input border-theme text-muted hover:text-body"}`,
                              children: [
                                e.jsxs("div", {
                                  className:
                                    "w-full h-8 rounded-lg bg-[#070b14] border border-slate-800 flex items-center justify-center gap-1.5",
                                  children: [
                                    e.jsx(is, {
                                      className: "w-3.5 h-3.5 text-indigo-400",
                                    }),
                                    e.jsx("span", {
                                      className:
                                        "text-[10px] font-bold text-slate-200",
                                      children: "#070B14",
                                    }),
                                  ],
                                }),
                                e.jsxs("div", {
                                  className: "text-center",
                                  children: [
                                    e.jsx("div", {
                                      className:
                                        "font-extrabold text-[11px] text-body",
                                      children: "🌙 Sombre",
                                    }),
                                    e.jsx("div", {
                                      className: "text-[9.5px] text-muted",
                                      children: "Ambiance Nuit",
                                    }),
                                  ],
                                }),
                              ],
                            }),
                            e.jsxs("button", {
                              type: "button",
                              onClick: () => Ze("light"),
                              className: `p-2.5 rounded-xl border flex flex-col items-center gap-1.5 transition text-left cursor-pointer ${W === "light" ? "bg-card border-emerald-500 ring-2 ring-emerald-500/30 text-body shadow-xs" : "bg-input border-theme text-muted hover:text-body"}`,
                              children: [
                                e.jsxs("div", {
                                  className:
                                    "w-full h-8 rounded-lg bg-white border border-slate-300 flex items-center justify-center gap-1.5",
                                  children: [
                                    e.jsx(ns, {
                                      className: "w-3.5 h-3.5 text-amber-500",
                                    }),
                                    e.jsx("span", {
                                      className:
                                        "text-[10px] font-bold text-slate-900",
                                      children: "Pur Blanc",
                                    }),
                                  ],
                                }),
                                e.jsxs("div", {
                                  className: "text-center",
                                  children: [
                                    e.jsx("div", {
                                      className:
                                        "font-extrabold text-[11px] text-body",
                                      children: "☀️ Pur Blanc",
                                    }),
                                    e.jsx("div", {
                                      className:
                                        "text-[9.5px] text-emerald-500 font-bold",
                                      children: "Moderne & Épuré",
                                    }),
                                  ],
                                }),
                              ],
                            }),
                            e.jsxs("button", {
                              type: "button",
                              onClick: () => Ze("blue"),
                              className: `p-2.5 rounded-xl border flex flex-col items-center gap-1.5 transition text-left cursor-pointer ${W === "blue" ? "bg-card border-sky-400 ring-2 ring-sky-400/30 text-body shadow-xs" : "bg-input border-theme text-muted hover:text-body"}`,
                              children: [
                                e.jsxs("div", {
                                  className:
                                    "w-full h-8 rounded-lg bg-[#0a192f] border border-sky-600 flex items-center justify-center gap-1.5",
                                  children: [
                                    e.jsx(os, {
                                      className: "w-3.5 h-3.5 text-sky-400",
                                    }),
                                    e.jsx("span", {
                                      className:
                                        "text-[10px] font-bold text-sky-200",
                                      children: "#0A192F",
                                    }),
                                  ],
                                }),
                                e.jsxs("div", {
                                  className: "text-center",
                                  children: [
                                    e.jsx("div", {
                                      className:
                                        "font-extrabold text-[11px] text-body",
                                      children: "💧 Pur Bleu",
                                    }),
                                    e.jsx("div", {
                                      className:
                                        "text-[9.5px] text-sky-400 font-bold",
                                      children: "Brand Signature",
                                    }),
                                  ],
                                }),
                              ],
                            }),
                          ],
                        }),
                      ],
                    }),
                    e.jsxs("div", {
                      children: [
                        e.jsx("label", {
                          className: "text-body font-bold block mb-1",
                          children: "Nom commercial de la boutique",
                        }),
                        e.jsx("input", {
                          type: "text",
                          value: n.storeName,
                          onChange: (t) =>
                            j((s) => ({ ...s, storeName: t.target.value })),
                          className:
                            "w-full bg-input border border-theme rounded-xl px-3 py-2 text-body font-bold focus:border-emerald-500 focus:outline-none",
                          placeholder: "Ex: Supérette Nana Bamako",
                        }),
                      ],
                    }),
                    e.jsxs("div", {
                      children: [
                        e.jsx("label", {
                          className: "text-body font-bold block mb-1",
                          children: "Numéro WhatsApp Récepteur des Commandes",
                        }),
                        e.jsx("input", {
                          type: "tel",
                          value: n.whatsappPhone,
                          onChange: (t) =>
                            j((s) => ({ ...s, whatsappPhone: t.target.value })),
                          className:
                            "w-full bg-input border border-theme rounded-xl px-3 py-2 text-body font-bold focus:border-emerald-500 focus:outline-none",
                          placeholder: "Ex: +226 70 00 00 00",
                        }),
                      ],
                    }),
                    e.jsxs("div", {
                      children: [
                        e.jsx("label", {
                          className: "text-body font-bold block mb-1",
                          children: "Slogan ou promesse client",
                        }),
                        e.jsx("input", {
                          type: "text",
                          value: n.welcomeText,
                          onChange: (t) =>
                            j((s) => ({ ...s, welcomeText: t.target.value })),
                          className:
                            "w-full bg-input border border-theme rounded-xl px-3 py-2 text-body focus:border-emerald-500 focus:outline-none",
                          placeholder:
                            "Ex: Livraison express en moins de 30 minutes !",
                        }),
                      ],
                    }),
                    e.jsxs("div", {
                      children: [
                        e.jsx("label", {
                          className: "text-body font-bold block mb-1",
                          children: "Adresse personnalisée du lien (Slug)",
                        }),
                        e.jsxs("div", {
                          className:
                            "flex items-center bg-input border border-theme rounded-xl px-3 py-2 text-muted",
                          children: [
                            e.jsxs("span", {
                              className: "font-mono text-[11px]",
                              children: [
                                getBaseOrigin().replace(/^https?:\/\//, ""),
                                "/store/",
                              ],
                            }),
                            e.jsx("input", {
                              type: "text",
                              value: n.slug,
                              onChange: (t) =>
                                j((s) => ({
                                  ...s,
                                  slug: t.target.value
                                    .toLowerCase()
                                    .replace(/[^a-z0-9]+/g, "-"),
                                })),
                              className:
                                "bg-transparent text-emerald-500 font-bold focus:outline-none ml-1 flex-1 font-mono text-[11px]",
                            }),
                          ],
                        }),
                      ],
                    }),
                    e.jsxs("div", {
                      className:
                        "p-3 bg-slate-950/80 border border-slate-800 rounded-2xl space-y-2.5",
                      children: [
                        e.jsxs("div", {
                          className: "flex items-center justify-between",
                          children: [
                            e.jsxs("div", {
                              className: "flex items-center gap-2",
                              children: [
                                e.jsx("div", {
                                  className:
                                    "w-7 h-7 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center font-bold",
                                  children: e.jsx(Xe, {
                                    className: "w-4 h-4 animate-pulse",
                                  }),
                                }),
                                e.jsxs("div", {
                                  children: [
                                    e.jsx("h4", {
                                      className:
                                        "font-extrabold text-white text-xs",
                                      children:
                                        "Bandeau Défilant & Moyens de Paiement",
                                    }),
                                    e.jsx("p", {
                                      className: "text-[10px] text-slate-400",
                                      children:
                                        "Annonce animée en haut de la vitrine",
                                    }),
                                  ],
                                }),
                              ],
                            }),
                            e.jsxs("button", {
                              type: "button",
                              onClick: () => {
                                (u(), It(!0));
                              },
                              className:
                                "bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/30 text-[10.5px] font-extrabold px-2.5 py-1.5 rounded-xl flex items-center gap-1 transition cursor-pointer",
                              children: [
                                e.jsx(as, { className: "w-3.5 h-3.5" }),
                                e.jsx("span", {
                                  children: "Styles & Couleurs",
                                }),
                              ],
                            }),
                          ],
                        }),
                        e.jsxs("div", {
                          children: [
                            e.jsx("label", {
                              className:
                                "text-slate-300 text-[11px] font-bold block mb-1",
                              children: "Texte du bandeau défilant",
                            }),
                            e.jsx("textarea", {
                              rows: 2,
                              value: n.paymentTickerText || Me,
                              onChange: (t) =>
                                j((s) => ({
                                  ...s,
                                  paymentTickerText: t.target.value,
                                })),
                              placeholder:
                                "Ex: LIVRAISON OFFERTE DÈS 10 000 F CFA • PAIEMENT WAVE & ORANGE MONEY...",
                              className:
                                "w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-white text-xs focus:border-amber-500 focus:outline-none resize-none leading-relaxed",
                            }),
                          ],
                        }),
                        e.jsxs("div", {
                          className: "flex items-center justify-between pt-1",
                          children: [
                            e.jsx("span", {
                              className:
                                "text-[11px] text-slate-300 font-medium",
                              children: "Afficher le bandeau sur la boutique",
                            }),
                            e.jsx("button", {
                              type: "button",
                              onClick: () => {
                                (u(),
                                  j((t) => ({
                                    ...t,
                                    showPaymentTicker:
                                      t.showPaymentTicker === !1,
                                  })));
                              },
                              className: `relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${n.showPaymentTicker !== !1 ? "bg-amber-500" : "bg-slate-800"}`,
                              children: e.jsx("span", {
                                className: `pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${n.showPaymentTicker !== !1 ? "translate-x-4" : "translate-x-0"}`,
                              }),
                            }),
                          ],
                        }),
                      ],
                    }),
                    e.jsxs("div", {
                      className:
                        "p-3.5 bg-slate-950/80 border border-slate-800 rounded-2xl space-y-3",
                      children: [
                        e.jsxs("div", {
                          className:
                            "flex items-center justify-between border-b border-slate-800/80 pb-2",
                          children: [
                            e.jsxs("div", {
                              className: "flex items-center gap-2",
                              children: [
                                e.jsx("div", {
                                  className:
                                    "w-7 h-7 rounded-xl bg-indigo-500/20 text-indigo-400 flex items-center justify-center font-bold",
                                  children: e.jsx(vt, { className: "w-4 h-4" }),
                                }),
                                e.jsxs("div", {
                                  children: [
                                    e.jsxs("div", {
                                      className: "flex items-center gap-2",
                                      children: [
                                        e.jsx("h4", {
                                          className:
                                            "font-extrabold text-white text-xs",
                                          children:
                                            "Pixels Publicitaires & Tracking",
                                        }),
                                        se !== "verified" && !isSuperAdminLocally(c) &&
                                          e.jsxs("span", {
                                            className:
                                              "text-[9px] font-bold text-amber-300 bg-amber-950/80 border border-amber-500/40 px-1.5 py-0.2 rounded-full flex items-center gap-1",
                                            children: [
                                              e.jsx(_e, {
                                                className: "w-2.5 h-2.5",
                                              }),
                                              " Palier 2",
                                            ],
                                          }),
                                      ],
                                    }),
                                    e.jsx("p", {
                                      className: "text-[10px] text-slate-400",
                                      children:
                                        "Meta Ads (Facebook/Instagram) & TikTok Ads",
                                    }),
                                  ],
                                }),
                              ],
                            }),
                            (n.fbPixelId || n.tiktokPixelId) &&
                              se === "verified" &&
                              e.jsx("button", {
                                type: "button",
                                onClick: () => {
                                  (u(),
                                    cs("ContactWhatsApp", {
                                      storeName: n.storeName,
                                      productName: "Test Pixel",
                                      value: 1e3,
                                    }),
                                    b(
                                      "Événement de test Pixel envoyé avec succès !",
                                    ));
                                },
                                className:
                                  "bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/30 text-[10px] font-bold px-2 py-1 rounded-lg transition cursor-pointer",
                                children: "Tester le tracking",
                              }),
                          ],
                        }),
                        se !== "verified" && !isSuperAdminLocally(c) &&
                          e.jsxs("div", {
                            className:
                              "p-2.5 rounded-xl bg-amber-950/40 border border-amber-500/40 flex items-start gap-2.5 text-xs",
                            children: [
                              e.jsx(_e, {
                                className:
                                  "w-4 h-4 text-amber-400 shrink-0 mt-0.5",
                              }),
                              e.jsxs("div", {
                                className: "space-y-1",
                                children: [
                                  e.jsx("p", {
                                    className:
                                      "text-amber-200 font-bold text-[11px]",
                                    children:
                                      "Débloquez votre vitrine en ligne certifiée en complétant votre vérification",
                                  }),
                                  e.jsx("p", {
                                    className:
                                      "text-slate-300 text-[10px] leading-relaxed",
                                    children:
                                      "L'activation des pixels publicitaires Meta Ads et TikTok Ads nécessite une boutique formellement vérifiée (Palier 2) pour assurer la conformité et la sécurité des acheteurs.",
                                  }),
                                  e.jsxs("button", {
                                    type: "button",
                                    onClick: () => {
                                      (u(), Ce(!1), Ie(!0));
                                    },
                                    className:
                                      "mt-1 bg-amber-600 hover:bg-amber-500 text-white text-[10px] font-bold px-2.5 py-1 rounded-lg flex items-center gap-1 cursor-pointer transition shadow-xs active:scale-95",
                                    children: [
                                      e.jsx(Ne, { className: "w-3 h-3" }),
                                      e.jsx("span", {
                                        children:
                                          "Vérifier ma boutique (Palier 2)",
                                      }),
                                    ],
                                  }),
                                ],
                              }),
                            ],
                          }),
                        e.jsxs("div", {
                          className: "space-y-1",
                          children: [
                            e.jsxs("div", {
                              className: "flex items-center justify-between",
                              children: [
                                e.jsxs("label", {
                                  className:
                                    "text-slate-300 font-bold text-[11px] flex items-center gap-1.5",
                                  children: [
                                    e.jsx("span", {
                                      className:
                                        "w-2 h-2 rounded-full bg-blue-500 inline-block shadow-xs",
                                    }),
                                    e.jsx("span", {
                                      children: "Pixel Facebook / Meta Ads",
                                    }),
                                  ],
                                }),
                                n.fbPixelId
                                  ? e.jsxs("span", {
                                      className:
                                        "text-[9.5px] font-extrabold text-emerald-400 bg-emerald-950/60 border border-emerald-500/30 px-1.5 py-0.5 rounded",
                                      children: [
                                        "🟢 Actif (",
                                        n.fbPixelId,
                                        ")",
                                      ],
                                    })
                                  : e.jsx("span", {
                                      className: "text-[9.5px] text-slate-500",
                                      children: "Non configuré",
                                    }),
                              ],
                            }),
                            e.jsx("input", {
                              type: "text",
                              value: n.fbPixelId,
                              onChange: (t) => {
                                const s = ds(t.target.value, "facebook");
                                j((o) => ({ ...o, fbPixelId: s }));
                              },
                              className:
                                "w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-white font-mono text-xs focus:border-blue-500 focus:outline-none",
                              placeholder:
                                "Ex: 123456789012345 (ID ou script fbq)",
                            }),
                            e.jsx("p", {
                              className:
                                "text-[9.5px] text-slate-400 leading-tight",
                              children:
                                "Optimisez vos campagnes Facebook/Instagram : suivi automatique des visites et des commandes WhatsApp.",
                            }),
                          ],
                        }),
                        e.jsxs("div", {
                          className: "space-y-1 pt-1",
                          children: [
                            e.jsxs("div", {
                              className: "flex items-center justify-between",
                              children: [
                                e.jsxs("label", {
                                  className:
                                    "text-slate-300 font-bold text-[11px] flex items-center gap-1.5",
                                  children: [
                                    e.jsx("span", {
                                      className:
                                        "w-2 h-2 rounded-full bg-pink-500 inline-block shadow-xs",
                                    }),
                                    e.jsx("span", {
                                      children: "Pixel TikTok Ads",
                                    }),
                                  ],
                                }),
                                n.tiktokPixelId
                                  ? e.jsxs("span", {
                                      className:
                                        "text-[9.5px] font-extrabold text-pink-400 bg-pink-950/60 border border-pink-500/30 px-1.5 py-0.5 rounded",
                                      children: [
                                        "🟢 Actif (",
                                        n.tiktokPixelId,
                                        ")",
                                      ],
                                    })
                                  : e.jsx("span", {
                                      className: "text-[9.5px] text-slate-500",
                                      children: "Non configuré",
                                    }),
                              ],
                            }),
                            e.jsx("input", {
                              type: "text",
                              value: n.tiktokPixelId,
                              onChange: (t) => {
                                const s = ds(t.target.value, "tiktok");
                                j((o) => ({ ...o, tiktokPixelId: s }));
                              },
                              className:
                                "w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-white font-mono text-xs focus:border-pink-500 focus:outline-none",
                              placeholder:
                                "Ex: C1234567890ABCDEF (ID ou script ttq)",
                            }),
                            e.jsx("p", {
                              className:
                                "text-[9.5px] text-slate-400 leading-tight",
                              children:
                                "Mesurez l'impact commercial de vos vidéos sponsorisées TikTok en Afrique de l'Ouest.",
                            }),
                          ],
                        }),
                      ],
                    }),
                  ],
                }),
                e.jsxs("div", {
                  className:
                    "flex gap-2 p-4 border-t border-slate-800 bg-slate-900/90 backdrop-blur-xs shrink-0",
                  children: [
                    e.jsx("button", {
                      type: "button",
                      onClick: () => Ce(!1),
                      className:
                        "flex-1 bg-slate-800 hover:bg-slate-700 py-2.5 rounded-xl font-bold text-xs cursor-pointer text-slate-300",
                      children: "Fermer",
                    }),
                    e.jsx("button", {
                      type: "button",
                      onClick: () => {
                        (Ce(!1), Zs());
                      },
                      className:
                        "flex-1 bg-emerald-600 hover:bg-emerald-500 text-white py-2.5 rounded-xl font-black text-xs cursor-pointer shadow-md",
                      children: "Appliquer & Enregistrer",
                    }),
                  ],
                }),
              ],
            }),
          }),
        Es &&
          e.jsx("div", {
            className:
              "fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-xs animate-in fade-in duration-200",
            children: e.jsxs("div", {
              className:
                "w-full max-w-sm bg-card border border-theme rounded-3xl p-5 text-center space-y-4 shadow-2xl relative text-body",
              children: [
                e.jsx("button", {
                  type: "button",
                  onClick: () => at(!1),
                  className:
                    "absolute top-4 right-4 min-h-[44px] min-w-[44px] flex items-center justify-center p-2 rounded-full bg-secondary text-muted hover:text-body border border-theme cursor-pointer transition touch-manipulation",
                  "aria-label": "Fermer le partage",
                  children: e.jsx(Re, { className: "w-4 h-4" }),
                }),
                se === "verified"
                  ? e.jsxs(e.Fragment, {
                      children: [
                        e.jsx("div", {
                          className:
                            "w-12 h-12 rounded-2xl bg-emerald-600/20 text-emerald-400 flex items-center justify-center mx-auto",
                          children: e.jsx(_a, { className: "w-6 h-6" }),
                        }),
                        e.jsxs("div", {
                          className: "space-y-1",
                          children: [
                            e.jsx("div", {
                              className:
                                "flex items-center justify-center gap-1.5",
                              children: e.jsx("span", {
                                className:
                                  "text-[10px] font-black uppercase tracking-wider bg-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded-full border border-emerald-500/40",
                                children: "Boutique Certifiée ✓",
                              }),
                            }),
                            e.jsx("h3", {
                              className: "font-black text-body text-base",
                              children: "QR Code & Lien de Partage",
                            }),
                            e.jsx("p", {
                              className: "text-xs text-muted",
                              children:
                                "Vos clients peuvent scanner ce code à la caisse ou cliquer sur le lien pour commander depuis leur smartphone.",
                            }),
                          ],
                        }),
                        e.jsx("div", {
                          className:
                            "bg-white p-4 rounded-2xl inline-block shadow-lg mx-auto",
                          children: e.jsx("img", {
                            src: `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(Ee)}`,
                            alt: "QR Code Boutique",
                            loading: "lazy",
                            decoding: "async",
                            className: "w-44 h-44 mx-auto",
                          }),
                        }),
                        e.jsx("div", {
                          className:
                            "bg-input border border-theme p-2.5 rounded-xl text-xs font-mono text-emerald-500 dark:text-emerald-400 break-all",
                          children: Ee,
                        }),
                        e.jsxs("div", {
                          className: "flex flex-wrap gap-2",
                          children: [
                            typeof navigator < "u" &&
                              typeof navigator.share == "function" &&
                              e.jsxs("button", {
                                type: "button",
                                onClick: async () => {
                                  u();
                                  try {
                                    await navigator.share({
                                      title: n.storeName || "Nanasore",
                                      text: `Découvrez la boutique en ligne ${n.storeName || "Nanasore"} :`,
                                      url: Ee,
                                    });
                                  } catch {}
                                },
                                className:
                                  "w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 py-2.5 rounded-xl font-bold text-xs text-white flex items-center justify-center gap-1.5 shadow-md cursor-pointer transition active:scale-95",
                                children: [
                                  e.jsx(vt, { className: "w-3.5 h-3.5" }),
                                  e.jsx("span", {
                                    children:
                                      "Partager via une application (SMS, Réseaux...)",
                                  }),
                                ],
                              }),
                            e.jsxs("button", {
                              type: "button",
                              onClick: sa,
                              className:
                                "flex-1 bg-secondary hover:bg-card-hover border border-theme py-2.5 rounded-xl font-bold text-xs text-body flex items-center justify-center gap-1.5 cursor-pointer",
                              children: [
                                Mt
                                  ? e.jsx(fs, {
                                      className: "w-3.5 h-3.5 text-emerald-500",
                                    })
                                  : e.jsx(rs, { className: "w-3.5 h-3.5" }),
                                e.jsx("span", {
                                  children: Mt ? "Copié !" : "Copier le lien",
                                }),
                              ],
                            }),
                            e.jsxs("a", {
                              href: `https://api.whatsapp.com/send?text=${encodeURIComponent(`Découvrez notre boutique en ligne *${n.storeName}* et commandez directement sur WhatsApp : ${Ee}`)}`,
                              target: "_blank",
                              rel: "noreferrer",
                              onClick: () => u(),
                              className:
                                "flex-1 bg-emerald-600 hover:bg-emerald-500 py-2.5 rounded-xl font-bold text-xs text-white flex items-center justify-center gap-1.5 shadow-md",
                              children: [
                                e.jsx(hs, { className: "w-3.5 h-3.5" }),
                                e.jsx("span", {
                                  children: "Partager WhatsApp",
                                }),
                              ],
                            }),
                          ],
                        }),
                      ],
                    })
                  : e.jsxs("div", {
                      className: "space-y-4 py-2",
                      children: [
                        e.jsx("div", {
                          className:
                            "w-14 h-14 rounded-2xl bg-amber-500/20 text-amber-400 border border-amber-500/40 flex items-center justify-center mx-auto shadow-inner",
                          children: e.jsx(_e, { className: "w-7 h-7" }),
                        }),
                        e.jsxs("div", {
                          className: "space-y-1.5",
                          children: [
                            e.jsx("span", {
                              className:
                                "text-[10px] font-black uppercase tracking-wider bg-amber-500/20 text-amber-300 px-2.5 py-0.5 rounded-full border border-amber-500/40 inline-block",
                              children: "Palier 1 • Caisse Seule",
                            }),
                            e.jsx("h3", {
                              className: "font-black text-white text-base",
                              children:
                                "Vitrine en mode brouillon interne non indexé",
                            }),
                          ],
                        }),
                        e.jsx("p", {
                          className: "text-xs text-slate-300 leading-relaxed",
                          children:
                            "Débloquez votre vitrine en ligne certifiée en complétant votre vérification. Les partages publics, les Pixels Meta/TikTok et les domaines personnalisés nécessitent une boutique certifiée (Palier 2).",
                        }),
                        e.jsxs("div", {
                          className:
                            "p-3 rounded-2xl bg-slate-950/80 border border-slate-800 text-left text-[11px] space-y-1.5 text-slate-400",
                          children: [
                            e.jsxs("div", {
                              className:
                                "flex items-center gap-1.5 text-emerald-400 font-bold",
                              children: [
                                e.jsx(ue, { className: "w-3.5 h-3.5" }),
                                e.jsx("span", {
                                  children:
                                    "Caisse physique & tickets : 100% Débloqués",
                                }),
                              ],
                            }),
                            e.jsxs("div", {
                              className:
                                "flex items-center gap-1.5 text-amber-400 font-bold",
                              children: [
                                e.jsx(_e, { className: "w-3.5 h-3.5" }),
                                e.jsx("span", {
                                  children:
                                    "Partage public & Pixels : Déblocage via KYC",
                                }),
                              ],
                            }),
                          ],
                        }),
                        e.jsxs("div", {
                          className: "pt-2 space-y-2",
                          children: [
                            e.jsxs("button", {
                              type: "button",
                              onClick: () => {
                                (u(), at(!1), Ie(!0));
                              },
                              className:
                                "w-full bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 text-slate-950 font-black text-xs py-3 rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-emerald-950/40 cursor-pointer transition active:scale-95",
                              children: [
                                e.jsx(Ne, { className: "w-4 h-4" }),
                                e.jsx("span", {
                                  children:
                                    "Débloquer ma vitrine certifiée (KYC)",
                                }),
                              ],
                            }),
                            e.jsx("button", {
                              type: "button",
                              onClick: () => at(!1),
                              className:
                                "w-full bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs py-2 rounded-xl transition cursor-pointer",
                              children: "Fermer",
                            }),
                          ],
                        }),
                      ],
                    }),
              ],
            }),
          }),
        Ds &&
          e.jsx("div", {
            className:
              "fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-xs animate-in fade-in duration-200",
            children: e.jsxs("div", {
              className:
                "w-full max-w-sm bg-card border border-amber-500/40 rounded-3xl p-6 text-center space-y-4 shadow-2xl relative text-body",
              children: [
                e.jsx("button", {
                  type: "button",
                  onClick: () => lt(!1),
                  className:
                    "absolute top-4 right-4 min-h-[44px] min-w-[44px] flex items-center justify-center p-2 rounded-full bg-secondary text-muted hover:text-body border border-theme cursor-pointer transition touch-manipulation",
                  "aria-label": "Fermer la notification",
                  children: e.jsx(Re, { className: "w-4 h-4" }),
                }),
                e.jsx("div", {
                  className:
                    "w-14 h-14 rounded-2xl bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center justify-center mx-auto shadow-inner",
                  children: e.jsx(_e, { className: "w-7 h-7" }),
                }),
                e.jsxs("div", {
                  className: "space-y-1.5",
                  children: [
                    e.jsx("span", {
                      className:
                        "text-[10px] font-black uppercase tracking-wider bg-amber-500/20 text-amber-300 px-2.5 py-0.5 rounded-full border border-amber-500/40 inline-block",
                      children: "Palier 1 Actif (Caisse & Stock)",
                    }),
                    e.jsx("h3", {
                      className: "font-black text-body text-base",
                      children: "Vitrine en mode brouillon interne non indexé",
                    }),
                  ],
                }),
                e.jsx("p", {
                  className: "text-xs text-muted leading-relaxed",
                  children:
                    "Débloquez votre vitrine en ligne certifiée en complétant votre vérification. Votre caisse physique et l'impression de vos reçus restent 100% utilisables.",
                }),
                e.jsxs("div", {
                  className: "pt-2 space-y-2",
                  children: [
                    e.jsxs("button", {
                      type: "button",
                      onClick: () => {
                        (u(), lt(!1), Ie(!0));
                      },
                      className:
                        "w-full bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 text-slate-950 font-black text-xs py-3 rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-emerald-950/40 cursor-pointer transition active:scale-95",
                      children: [
                        e.jsx(Ne, { className: "w-4 h-4" }),
                        e.jsx("span", {
                          children: "Compléter ma vérification KYC",
                        }),
                      ],
                    }),
                    e.jsx("button", {
                      type: "button",
                      onClick: () => lt(!1),
                      className:
                        "w-full bg-secondary hover:bg-card-hover text-body border border-theme font-bold text-xs py-2 rounded-xl transition cursor-pointer",
                      children: "Retour à la vitrine",
                    }),
                  ],
                }),
              ],
            }),
          }),
        e.jsx(Ra, {
          isOpen: Os,
          onClose: () => Ie(!1),
          storeId: l,
          storeName: n.storeName,
          managerName: c?.name || n.storeName,
          managerPhone: n.whatsappPhone,
          currentSubmission: Ls,
          onSubmitted: (t) => {
            (it(t),
              ot(t.status),
              S && c && S({ ...c, kycStatus: t.status, kycData: t }),
              b(
                "✓ Dossier de certification transmis avec succès ! Examen sous 24h.",
              ));
          },
        }),
        Lt &&
          e.jsx(ma, {
            isOpen: Lt,
            onClose: () => We(!1),
            onSuccess: () => {
              ($s(!0), dt("merchant"));
              try {
                (sessionStorage.setItem(`nana_store_unlocked_${l}`, "true"),
                  localStorage.setItem(
                    `nana_vitrine_view_mode_${l}`,
                    "merchant",
                  ));
              } catch {}
              (We(!1), b("👑 Espace Commerçant déverrouillé avec succès !"));
            },
            title: "Accès Espace Commerçant",
            description:
              "Entrez votre mot de passe ou code secret Master PIN (4 à 6 chiffres) pour gérer votre boutique.",
            actionBadge: "ESPACE PROPRIÉTAIRE",
            masterPinHashOrCode: qs || c?.masterPin || c?.pinCode,
          }),
        !N &&
          T &&
          e.jsx(La, {
            isOpen: Ps,
            onClose: () => {
              (qe(!1), Fe(null));
            },
            productToEdit: Is,
            onProductAdded: Gs,
            onProductUpdated: Js,
            storeId: l,
            existingCategories: Ks,
            currentUser: c,
            subscription: E,
            onOpenUpgrade: V,
            currentProductCount: h.length,
            availableProducts: h,
          }),
        !N &&
          T &&
          e.jsx(Ya, {
            isOpen: _s,
            onClose: () => It(!1),
            initialText: n.paymentTickerText || Me,
            initialBgGradient:
              n.tickerBgGradient ||
              "from-amber-600 via-orange-600 to-amber-600",
            initialShowTicker: n.showPaymentTicker !== !1,
            onSave: async (t, s, o) => {
              if (!T) return;
              j((d) => ({
                ...d,
                paymentTickerText: t,
                tickerBgGradient: s,
                showPaymentTicker: o,
              }));
              const a = {
                ...n,
                paymentTickerText: t,
                tickerBgGradient: s,
                showPaymentTicker: o,
              };
              (localStorage.setItem(
                `nana_tenant_${l}_store_config`,
                JSON.stringify(a),
              ),
                localStorage.setItem(
                  "nana_store_hub_config",
                  JSON.stringify(a),
                ));
              try {
                const d = ne(ee, "stores", l);
                await ve(d, a, { merge: !0 });
              } catch (d) {
                console.warn("Erreur sauvegarde Firestore du bandeau", d);
              }
              b("Bandeau promotionnel et moyens de paiement mis à jour !");
            },
          }),
        M &&
          e.jsx(Oa, {
            isOpen: M,
            onClose: () => Y(!1),
            currentThemeId: n.active_theme_id || "theme-default",
            targetStoreId: l,
            onThemeActivated: async (t) => {
              j((s) => ({ ...s, active_theme_id: t, activeThemeId: t }));
              try {
                if (l) {
                  await ensureAndPersistTenantSlug(
                    l,
                    { ...n, activeThemeId: t, active_theme_id: t, themeId: t },
                    c?.uid || auth?.currentUser?.uid,
                    { themeId: t }
                  );
                }
              } catch (s) {
                console.warn("[Dashboard] Auto-persist theme error:", s);
              }
              b("Thème mis à jour avec succès !");
            },
          }),
        yt &&
          !N &&
          T &&
          e.jsx(us.Suspense, {
            fallback: null,
            children: e.jsx(rr, {
              isOpen: yt,
              onClose: () => {
                (bs(!1), gs(null));
              },
              initialProductName: De?.name || "",
              initialFeatures: De?.category ? `Catégorie : ${De.category}` : "",
              initialPrice: De?.price || 0,
              storeName: n.storeName || c?.storeName || "Votre Boutique",
              currentUser: c,
              subscription: E,
              onOpenUpgrade: V,
            }),
          }),
        jt &&
          !N &&
          T &&
          e.jsx(Va, {
            isOpen: jt,
            merchantId: l,
            storeName: n.storeName,
            onClose: () => ws(!1),
            isPublicView: N,
          }),
        Ts &&
          I.length > 0 &&
          e.jsx(ls, {
            isModal: !0,
            product: {
              id: I[0]?.product.id,
              name:
                I.length === 1
                  ? I[0].product.name
                  : `${I[0]?.product.name} (+${I.length - 1} autre(s))`,
              price: He,
              originalPrice: Math.round(He * 1.25),
              imageUrl: I[0]?.product.image || "",
              description:
                I.length === 1
                  ? I[0].product.description
                  : `Commande groupée de ${Ae} article${Ae > 1 ? "s" : ""}`,
              quantity: Ae,
              items: I.map((t) => ({
                id: t.product.id,
                name: t.product.name,
                price: t.product.price,
                quantity: t.quantity,
                imageUrl: t.product.image,
              })),
            },
            amount: He,
            currency: "FCFA",
            orderDescription: `Commande ${n.storeName} (${Ae} article${Ae > 1 ? "s" : ""})`,
            storeName: n.storeName,
            whatsappPhone: n.whatsappPhone,
            defaultPhone: fe,
            defaultAddress: me,
            defaultCustomerName: de,
            defaultEmail: be,
            sellerConfig: Vt,
            onSuccess: (t) => {
              (zt(t), pe(!1));
            },
            onCancel: () => {
              (pe(!1), Ve(null));
            },
            onBackToStore: () => {
              (pe(!1), Ve(null));
            },
          }),
        !1,
        Pe &&
          e.jsx("div", {
            className:
              "fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-xs p-4 animate-in fade-in duration-200",
            children: e.jsxs("div", {
              className:
                "w-full max-w-sm bg-card border border-emerald-500/40 rounded-3xl p-6 text-center space-y-4 shadow-2xl relative text-body",
              children: [
                e.jsx("div", {
                  className:
                    "w-16 h-16 rounded-3xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center mx-auto shadow-inner",
                  children: e.jsx(ue, { className: "w-9 h-9" }),
                }),
                e.jsxs("div", {
                  className: "space-y-1",
                  children: [
                    e.jsx("span", {
                      className:
                        "text-[10px] font-black uppercase tracking-wider bg-emerald-500/20 text-emerald-400 px-2.5 py-0.5 rounded-full border border-emerald-500/40 inline-block",
                      children: "Commande Validée ✓",
                    }),
                    e.jsx("h3", {
                      className: "font-black text-body text-lg",
                      children: "Merci pour votre commande !",
                    }),
                    e.jsxs("p", {
                      className: "text-xs text-muted",
                      children: [
                        "Votre commande a été transmise avec succès à ",
                        e.jsx("strong", {
                          className: "text-body",
                          children: n.storeName,
                        }),
                        ".",
                      ],
                    }),
                  ],
                }),
                e.jsxs("div", {
                  className:
                    "p-3.5 rounded-2xl bg-secondary border border-theme text-left text-xs space-y-2",
                  children: [
                    e.jsxs("div", {
                      className: "flex justify-between items-center text-muted",
                      children: [
                        e.jsx("span", { children: "Réf. Commande :" }),
                        e.jsx("span", {
                          className: "font-mono font-bold text-emerald-500",
                          children: Pe.orderNumber,
                        }),
                      ],
                    }),
                    e.jsxs("div", {
                      className: "flex justify-between items-center text-muted",
                      children: [
                        e.jsx("span", { children: "Total :" }),
                        e.jsx("span", {
                          className: "font-black text-body text-sm",
                          children: z(Pe.total),
                        }),
                      ],
                    }),
                    e.jsxs("div", {
                      className: "flex justify-between items-center text-muted",
                      children: [
                        e.jsx("span", { children: "Règlement :" }),
                        e.jsx("span", {
                          className: "font-bold text-body",
                          children: Pe.paymentMethod,
                        }),
                      ],
                    }),
                    e.jsxs("div", {
                      className: "flex justify-between items-center text-muted",
                      children: [
                        e.jsx("span", { children: "Heure :" }),
                        e.jsx("span", {
                          className: "text-muted",
                          children: Pe.createdAt,
                        }),
                      ],
                    }),
                  ],
                }),
                e.jsx("div", {
                  className: "pt-2 space-y-2",
                  children: e.jsx("button", {
                    type: "button",
                    onClick: () => {
                      (u(), At(null), pe(!1));
                    },
                    className:
                      "w-full bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs py-3 rounded-xl cursor-pointer transition shadow-md",
                    children: "Continuer mes achats",
                  }),
                }),
              ],
            }),
          }),
        Ms &&
          q &&
          e.jsx(ls, {
            isModal: !0,
            product: {
              id: q.orderId,
              name: q.description,
              price: q.total,
              originalPrice: Math.round(q.total * 1.25),
              imageUrl: q.items?.[0]?.product?.image || "",
            },
            amount: q.total,
            currency: "FCFA",
            orderDescription: q.description,
            orderId: q.orderId,
            defaultPhone: fe,
            defaultAddress: me,
            defaultCustomerName: de,
            defaultEmail: be,
            storeName: n.storeName,
            whatsappPhone: n.whatsappPhone,
            sellerConfig: Vt,
            onSuccess: zt,
            onCancel: () => rt(!1),
            onBackToStore: () => rt(!1),
          }),
        aa &&
          e.jsx("button", {
            type: "button",
            onClick: () => {
              u();
              const t = document.getElementById(
                "dashboard-storefront-container",
              );
              t && t.scrollTo({ top: 0, behavior: "smooth" });
            },
            className:
              "fixed bottom-20 right-4 z-40 p-3 rounded-full bg-emerald-600 hover:bg-emerald-500 text-white shadow-xl shadow-emerald-950/60 border border-emerald-400/40 active:scale-90 transition-all flex items-center justify-center cursor-pointer touch-manipulation",
            title: "Remonter en haut de la vitrine",
            "aria-label": "Remonter en haut",
            children: e.jsx(Ma, { className: "w-5 h-5 stroke-[2.5]" }),
          }),
        Ot &&
          e.jsx(Wa, {
            isOpen: Ot,
            onClose: () => ut(!1),
            orders: Ge,
            storeId: l,
            storeName: n.storeName || c?.storeName,
          }),
        e.jsx(ua, {
          order: Us,
          onDismiss: () => Dt(null),
          onViewOrder: () => {
            ut(!0);
          },
        }),
        e.jsx(xa, {
          isOpen: vs,
          onClose: () => St(!1),
          currentContextView: "STORE",
          onLaunchMiniPlayer: (t) => {
            kt(t);
          },
          activeMiniTutorialId: ke?.id,
        }),
        ke &&
          e.jsx(ha, {
            tutorial: ke,
            isCompleted: Ns.includes(ke.id),
            onClose: () => kt(null),
            onExpand: () => {
              St(!0);
            },
            onToggleComplete: () => {
              pa(ke.id);
            },
          }),
      ],
    });
  };
export { Vr as DashboardView, Vr as default };
