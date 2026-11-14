/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * nanawallet — Portefeuille Crypto & USDT Bientôt Disponible (Étape 3)
 * Design Épuré, Moderne & Chaleureux de Classe Mondiale.
 * Palette Officielle : Fond blanc cassé (#F9F8F6), Accents Bleu Royal (#1E3A8A / #2563EB).
 */

import React, { useState, useCallback } from 'react';
import { 
  ArrowLeft, 
  Sparkles, 
  Shield, 
  Zap, 
  CheckCircle, 
  Bell, 
  Globe2, 
  TrendingUp, 
  Layers, 
  ArrowRight,
  RefreshCw,
  X
} from 'lucide-react';
import { playTapBeep, playValidationBeep } from '../../utils/audio';
import { supabase } from '../../lib/supabase';

export interface NanaWalletCryptoComingSoonProps {
  onBack?: () => void;
  className?: string;
}

export default function NanaWalletCryptoComingSoon({ 
  onBack, 
  className = '' 
}: NanaWalletCryptoComingSoonProps) {
  const [contactInput, setContactInput] = useState<string>('');
  const [contactType, setContactType] = useState<'email' | 'phone'>('email');
  const [subscribed, setSubscribed] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('nana_crypto_waitlist_registered') === 'true';
    }
    return false;
  });
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = useCallback((msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  }, []);

  const handleSubscribe = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!contactInput.trim()) return;

    playTapBeep();
    setIsSubmitting(true);

    try {
      // 1. Sauvegarde locale immédiate
      localStorage.setItem('nana_crypto_waitlist_registered', 'true');
      localStorage.setItem('nana_crypto_waitlist_contact', contactInput.trim());

      // 2. Sauvegarde Supabase
      try {
        const cleanContact = contactInput.trim().replace(/[^a-zA-Z0-9]/g, '_');
        await supabase.from('app_registry').upsert({
          key: `crypto_waitlist_${cleanContact}`,
          name: contactInput.trim(),
          module_key: 'crypto_waitlist',
          config_json: {
            contact: contactInput.trim(),
            contactType,
            createdAt: new Date().toISOString(),
            source: 'nanawallet_crypto_coming_soon'
          },
          updated_at: new Date().toISOString()
        });
      } catch (err) {
        console.warn('[CRYPTO WAITLIST] Erreur Supabase ignorée :', err);
      }

      setIsSubmitting(false);
      setSubscribed(true);
      playValidationBeep();
      showToast("✨ Inscription validée ! Vous êtes sur la liste d'accès anticipé.");
    } catch {
      setIsSubmitting(false);
      setSubscribed(true);
      playValidationBeep();
    }
  };

  return (
    <div className={`min-h-screen bg-[#F9F8F6] text-[#1A1A1A] font-sans antialiased flex justify-center items-center p-0 sm:p-4 select-none ${className}`}>
      
      {/* Toast Flottant de Notification */}
      {toastMessage && (
        <div className="fixed top-5 z-50 max-w-sm w-[90%] bg-[#1E3A8A] text-white text-xs font-bold px-4 py-3 rounded-2xl shadow-2xl border border-blue-400/40 flex items-center gap-3 animate-bounce">
          <Sparkles className="w-4 h-4 text-amber-300 shrink-0" />
          <span className="flex-1">{toastMessage}</span>
          <button onClick={() => setToastMessage(null)} className="text-blue-200 hover:text-white">
            <X size={16} />
          </button>
        </div>
      )}

      {/* Conteneur simulant l'écran d'un smartphone moderne */}
      <div className="w-full max-w-md bg-[#F9F8F6] sm:rounded-[3rem] sm:shadow-2xl overflow-hidden flex flex-col h-screen sm:h-[844px] border-0 sm:border-8 sm:border-[#1E3A8A] relative">
        
        {/* ===================================================================== */}
        {/* EN-TÊTE SUPÉRIEURE (HEADER) */}
        {/* ===================================================================== */}
        <div className="px-6 pt-6 sm:pt-8 pb-4 flex items-center justify-between bg-[#F9F8F6] border-b border-gray-100/60 sticky top-0 z-20">
          <div className="flex items-center space-x-3">
            <button
              type="button"
              onClick={() => {
                playTapBeep();
                if (onBack) onBack();
              }}
              className="w-9 h-9 rounded-full bg-white shadow-xs border border-gray-100 flex items-center justify-center text-[#1E3A8A] cursor-pointer hover:bg-blue-50 transition active:scale-95"
              title="Retour au portefeuille"
            >
              <ArrowLeft size={18} />
            </button>
            <div>
              <h2 className="text-sm font-bold text-[#1A1A1A]">Portefeuille Crypto</h2>
              <p className="text-[10px] text-gray-400 font-medium">Stablecoins USDT &amp; Paiements Globaux</p>
            </div>
          </div>
          <span className="text-[10px] bg-blue-100 text-[#1E3A8A] font-black px-2.5 py-1 rounded-full uppercase tracking-wider border border-blue-200 shadow-2xs">
            Futur
          </span>
        </div>

        {/* ===================================================================== */}
        {/* CONTENU PRINCIPAL (DÉFILANT) */}
        {/* ===================================================================== */}
        <div className="px-6 flex-1 overflow-y-auto space-y-6 pb-6 pt-2">
          
          {/* Carte d'annonce élégante (Hero Card Crypto) */}
          <div className="bg-gradient-to-br from-[#1E3A8A] via-[#1E40AF] to-[#0F172A] text-white rounded-3xl p-6 shadow-xl shadow-blue-950/20 relative overflow-hidden text-center flex flex-col items-center border border-blue-400/20">
            {/* Effet visuel abstrait en arrière-plan */}
            <div className="absolute -right-12 -top-12 w-44 h-44 bg-blue-500/25 rounded-full blur-2xl pointer-events-none" />
            <div className="absolute -left-10 -bottom-10 w-36 h-36 bg-cyan-400/15 rounded-full blur-xl pointer-events-none" />
            
            <div className="w-14 h-14 rounded-2xl bg-white/10 text-white flex items-center justify-center mb-4 backdrop-blur-md border border-white/20 shadow-inner relative z-10">
              <span className="text-2xl font-black text-amber-300">₮</span>
            </div>
            
            <span className="text-[10px] bg-blue-900/80 text-cyan-300 px-3 py-1 rounded-full uppercase tracking-widest font-extrabold border border-cyan-400/30 mb-2 relative z-10 flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
              Prochainement
            </span>

            <h1 className="text-xl font-extrabold tracking-tight mt-1 text-white relative z-10">
              L&apos;ère Crypto &amp; USDT arrive sur nanawallet
            </h1>
            <p className="text-xs text-blue-100 mt-2 leading-relaxed relative z-10 max-w-xs">
              Rechargez et payez vos services à l&apos;international sans frontières grâce aux stablecoins sécurisés à taux 1:1 indexés sur le dollar.
            </p>

            {/* Badges Réseaux Compatibles */}
            <div className="flex items-center gap-2 mt-4 pt-3 border-t border-white/10 relative z-10">
              <span className="text-[10px] font-bold bg-white/15 px-2.5 py-1 rounded-lg text-blue-100 border border-white/10">
                🟣 Polygon POS
              </span>
              <span className="text-[10px] font-bold bg-white/15 px-2.5 py-1 rounded-lg text-blue-100 border border-white/10">
                🔴 Tron (TRC-20)
              </span>
            </div>
          </div>

          {/* Avantages techniques majeurs */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider">
              Ce qui vous attend
            </h3>
            
            {/* Avantage 1 */}
            <div className="bg-white p-3.5 rounded-2xl border border-gray-100 flex items-start space-x-3 shadow-xs hover:border-blue-200 transition">
              <div className="w-9 h-9 rounded-xl bg-blue-50 text-[#1E3A8A] flex items-center justify-center shrink-0 mt-0.5">
                <Zap size={17} />
              </div>
              <div>
                <p className="text-xs font-bold text-[#1A1A1A]">Dépôts &amp; Transferts ultra-rapides</p>
                <p className="text-[11px] text-gray-400 leading-relaxed font-medium">
                  Compatibilité native avec Polygon et Tron pour des micro-frais quasi-nuls (&lt; 0.05$) exécutés en moins de 3 secondes.
                </p>
              </div>
            </div>

            {/* Avantage 2 */}
            <div className="bg-white p-3.5 rounded-2xl border border-gray-100 flex items-start space-x-3 shadow-xs hover:border-blue-200 transition">
              <div className="w-9 h-9 rounded-xl bg-blue-50 text-[#1E3A8A] flex items-center justify-center shrink-0 mt-0.5">
                <Globe2 size={17} />
              </div>
              <div>
                <p className="text-xs font-bold text-[#1A1A1A]">Paiements sans frontières &amp; Zéro change</p>
                <p className="text-[11px] text-gray-400 leading-relaxed font-medium">
                  Recevez des fonds de clients internationaux partout dans le monde et convertissez-les en 1 clic en FCFA sur votre Mobile Money.
                </p>
              </div>
            </div>

            {/* Avantage 3 */}
            <div className="bg-white p-3.5 rounded-2xl border border-gray-100 flex items-start space-x-3 shadow-xs hover:border-blue-200 transition">
              <div className="w-9 h-9 rounded-xl bg-blue-50 text-[#1E3A8A] flex items-center justify-center shrink-0 mt-0.5">
                <Shield size={17} className="text-emerald-600" />
              </div>
              <div>
                <p className="text-xs font-bold text-[#1A1A1A]">Sécurité &amp; Garde Non-Custodiale Sécurisée</p>
                <p className="text-[11px] text-gray-400 leading-relaxed font-medium">
                  Protection multi-signatures et scellement Master PIN pour une tranquillité d&apos;esprit totale sur vos actifs.
                </p>
              </div>
            </div>
          </div>

          {/* Formulaire Liste d'attente (Waitlist VIP) */}
          <div className="bg-white p-5 rounded-3xl border border-gray-200 shadow-xs text-center">
            {!subscribed ? (
              <form onSubmit={handleSubscribe} className="space-y-3">
                <div className="flex items-center justify-center gap-1.5 text-[#1E3A8A] font-extrabold text-xs mb-1">
                  <Bell size={15} /> 
                  <span>Être averti en priorité du lancement</span>
                </div>
                <p className="text-[11px] text-gray-500 mb-3 font-medium">
                  Inscrivez-vous pour tester la bêta crypto et bénéficier de 0% de frais de conversion à vie.
                </p>

                {/* Sélecteur Email / WhatsApp */}
                <div className="flex items-center justify-center gap-2 mb-2">
                  <button
                    type="button"
                    onClick={() => setContactType('email')}
                    className={`text-[10px] font-bold px-2.5 py-1 rounded-lg transition ${
                      contactType === 'email' ? 'bg-blue-100 text-[#1E3A8A]' : 'text-gray-400 hover:text-gray-600'
                    }`}
                  >
                    Par Email
                  </button>
                  <button
                    type="button"
                    onClick={() => setContactType('phone')}
                    className={`text-[10px] font-bold px-2.5 py-1 rounded-lg transition ${
                      contactType === 'phone' ? 'bg-blue-100 text-[#1E3A8A]' : 'text-gray-400 hover:text-gray-600'
                    }`}
                  >
                    Par WhatsApp
                  </button>
                </div>

                <input
                  type={contactType === 'email' ? 'email' : 'tel'}
                  required
                  placeholder={contactType === 'email' ? "Votre adresse email (ex: nom@domaine.com)..." : "Votre numéro WhatsApp (+226...)"}
                  value={contactInput}
                  onChange={(e) => setContactInput(e.target.value)}
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl py-3 px-4 text-xs font-medium text-[#1A1A1A] focus:outline-none focus:border-[#1E3A8A] focus:bg-white shadow-2xs transition"
                />

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full bg-[#1E3A8A] text-white py-3.5 rounded-xl font-bold text-xs shadow-md shadow-blue-950/20 hover:bg-blue-900 transition-all active:scale-98 cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {isSubmitting ? (
                    <>
                      <RefreshCw size={15} className="animate-spin text-white" />
                      <span>Enregistrement sur la liste...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles size={15} className="text-amber-300" />
                      <span>Rejoindre la liste d&apos;attente VIP</span>
                    </>
                  )}
                </button>
              </form>
            ) : (
              <div className="py-4 space-y-2 animate-fadeIn">
                <div className="w-12 h-12 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto shadow-xs">
                  <CheckCircle size={26} />
                </div>
                <h4 className="text-sm font-extrabold text-[#1A1A1A]">
                  Vous êtes officiellement sur la liste VIP !
                </h4>
                <p className="text-[11px] text-gray-500 max-w-xs mx-auto leading-relaxed">
                  Nous vous préviendrons en avant-première dès l&apos;activation du module USDT sur nanawallet.
                </p>
                <div className="pt-2">
                  <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-3 py-1 rounded-full inline-block">
                    Pass Bêta #2026-USDT Réservé
                  </span>
                </div>
              </div>
            )}
          </div>

        </div>

      </div>
    </div>
  );
}
