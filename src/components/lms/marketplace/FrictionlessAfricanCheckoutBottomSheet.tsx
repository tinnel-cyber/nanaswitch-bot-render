import React, { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  X,
  Smartphone,
  MessageSquare,
  ShieldCheck,
  CheckCircle2,
  Lock,
  ArrowRight,
  Zap,
  Sparkles,
  RotateCcw,
  Check,
  PhoneCall,
  CreditCard,
  GraduationCap
} from 'lucide-react';
import { MarketplaceCourse, MobileMoneyProvider } from './types';
import { formatCFA, playCashChime, playValidationBeep, playTapBeep } from '../../../utils/audio';
import { recordMobileMoneyEnrollment } from '../../../services/marketplaceService';
import { recordCourseEnrollment, navigateToStudentDashboard } from '../../../services/studentAuthService';
import { useCheckout } from '../../../hooks/useCheckout';
import { NanasorePaymentGateway } from '../../payment/NanasorePaymentGateway';

interface FrictionlessAfricanCheckoutBottomSheetProps {
  course: MarketplaceCourse;
  isOpen: boolean;
  onClose: () => void;
  onEnrollSuccess: (courseId: string) => void;
  discountPercentage?: number;
  discountLabel?: string;
}

const MOBILE_MONEY_PROVIDERS: MobileMoneyProvider[] = [
  {
    id: 'WAVE',
    name: 'Wave Mobile Money',
    country: 'Burkina Faso, Sénégal, CI',
    color: '#1dc4e9',
    feeLabel: '1% Frais fixes',
    iconBg: 'bg-[#1dc4e9]/20 text-[#1dc4e9] border-[#1dc4e9]/40'
  },
  {
    id: 'ORANGE_MONEY',
    name: 'Orange Money',
    country: 'Burkina Faso, CI, Mali, Sénégal',
    color: '#ff7900',
    feeLabel: 'Instantané USSD *144#',
    iconBg: 'bg-[#ff7900]/20 text-[#ff7900] border-[#ff7900]/40'
  },
  {
    id: 'MOOV_MONEY',
    name: 'Moov Money',
    country: 'Burkina Faso, Bénin, Togo, CI',
    color: '#0082c3',
    feeLabel: 'Instantané USSD *555#',
    iconBg: 'bg-[#0082c3]/20 text-[#0082c3] border-[#0082c3]/40'
  },
  {
    id: 'MTN_MOMO',
    name: 'MTN Mobile Money',
    country: 'Bénin, CI, Ghana',
    color: '#ffcc00',
    feeLabel: 'Instantané MoMo',
    iconBg: 'bg-[#ffcc00]/20 text-[#ffcc00] border-[#ffcc00]/40'
  }
];

export const FrictionlessAfricanCheckoutBottomSheet: React.FC<FrictionlessAfricanCheckoutBottomSheetProps> = ({
  course,
  isOpen,
  onClose,
  onEnrollSuccess,
  discountPercentage,
  discountLabel
}) => {
  const [activeTab, setActiveTab] = useState<'MOMO' | 'WHATSAPP'>('MOMO');
  const [selectedProvider, setSelectedProvider] = useState<MobileMoneyProvider>(MOBILE_MONEY_PROVIDERS[0]);
  const [studentName, setStudentName] = useState('Ibrahim Pousbila Konkobo');
  const [phoneNumber, setPhoneNumber] = useState('+226 70 00 00 00');
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [countdown, setCountdown] = useState(5);
  const [isNanasoreGatewayOpen, setIsNanasoreGatewayOpen] = useState(false);

  const basePrice = course.discountPrice || course.price;
  const effectivePrice = discountPercentage && discountPercentage > 0
    ? Math.round(basePrice * (1 - discountPercentage / 100))
    : basePrice;

  const { initializeCheckout } = useCheckout();

  // Lancement du paiement Mobile Money sécurisé via Nanasore Payment Gateway (Règle 3)
  const handleTriggerMobileMoneyPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    playTapBeep();
    setIsNanasoreGatewayOpen(true);
  };

  const handleNanasoreLmsSuccess = async (details: any) => {
    setIsProcessing(true);
    try {
      await initializeCheckout({
        courseId: course.id,
        amount: effectivePrice,
        studentName,
        phoneNumber: details.phoneNumber || phoneNumber,
        provider: details.operator?.name || selectedProvider.id
      });

      await recordMobileMoneyEnrollment({
        courseId: course.id,
        studentName,
        phoneNumber: details.phoneNumber || phoneNumber,
        provider: details.operator?.name || selectedProvider.id,
        amount: effectivePrice
      });

      // Enregistrement du profil élève pour connexion ultérieure automatique
      recordCourseEnrollment({
        courseId: course.id,
        fullName: studentName,
        phoneNumber: details.phoneNumber || phoneNumber
      });

      setIsNanasoreGatewayOpen(false);
      setIsSuccess(true);
      playCashChime();
    } catch (err) {
      console.warn('Erreur enrollment LMS :', err);
      recordCourseEnrollment({
        courseId: course.id,
        fullName: studentName,
        phoneNumber: details?.phoneNumber || phoneNumber
      });
      setIsNanasoreGatewayOpen(false);
      setIsSuccess(true);
      playCashChime();
    } finally {
      setIsProcessing(false);
    }
  };

  // Souscription directe via WhatsApp Business
  const handleWhatsAppSubscription = () => {
    playTapBeep();
    const cleanPhone = '22670000000'; // Numéro officiel Konkobo Telecom
    const message = encodeURIComponent(
      `Bonjour ENTREPRISE KONKOBO POUSBILA,\n\nJe souhaite m'inscrire immédiatement à la formation :\n*${course.title}*\nTarif : *${formatCFA(effectivePrice)}*\n\nNom : ${studentName}\nTéléphone : ${phoneNumber}\n\nMerci de bien vouloir valider mon accès.`
    );
    const whatsappUrl = `https://wa.me/${cleanPhone}?text=${message}`;
    window.open(whatsappUrl, '_blank');
  };

  const handleFinishAndAccess = () => {
    playValidationBeep();
    onClose();
    if (onEnrollSuccess) {
      onEnrollSuccess(course.id);
    }
    navigateToStudentDashboard();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
          {/* Backdrop avec flou d'arrière-plan */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/80 backdrop-blur-md"
          />

          {/* Tiroir Coulissant / Bottom Sheet */}
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 28, stiffness: 300 }}
            className="relative w-full max-w-lg bg-slate-900 border-t sm:border border-slate-700/80 rounded-t-3xl sm:rounded-3xl shadow-2xl z-10 max-h-[92vh] flex flex-col overflow-hidden text-slate-100"
          >
            {/* Barre de préhension tactile mobile */}
            <div className="w-12 h-1.5 bg-slate-700 rounded-full mx-auto my-2.5 sm:hidden" />

            {/* En-tête */}
            <div className="px-6 py-4 border-b border-slate-800 bg-slate-950/70 flex items-center justify-between">
              <div>
                <span className="text-[10px] font-black uppercase tracking-wider text-emerald-400">
                  Inscription Instantanée 1-Clic
                </span>
                <h3 className="text-sm sm:text-base font-black text-white truncate max-w-[280px]">
                  {course.title}
                </h3>
              </div>

              <button
                type="button"
                onClick={onClose}
                className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Corps du Drawer */}
            <div className="flex-1 overflow-y-auto p-6 space-y-5">
              {!isSuccess ? (
                <>
                  {/* Récapitulatif du Tarif */}
                  <div className="p-4 rounded-2xl bg-gradient-to-br from-slate-950 to-slate-900 border border-slate-800 flex items-center justify-between">
                    <div>
                      <span className="text-xs text-slate-400">Montant Total à Régler :</span>
                      <div className="text-xl sm:text-2xl font-black text-white flex items-center gap-2">
                        {discountPercentage && discountPercentage > 0 ? (
                          <>
                            <span className="text-sm text-slate-500 line-through font-normal">
                              {formatCFA(basePrice)}
                            </span>
                            <span className="text-emerald-400">
                              {formatCFA(effectivePrice)}
                            </span>
                          </>
                        ) : (
                          <span>{formatCFA(effectivePrice)}</span>
                        )}
                      </div>
                      {discountPercentage && discountPercentage > 0 && (
                        <div className="mt-1">
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-black bg-amber-500/20 text-amber-300 border border-amber-500/30">
                            <CheckCircle2 className="w-2.5 h-2.5" />
                            {discountLabel || `Remise Flash Diagnostic (-${discountPercentage}%)`}
                          </span>
                        </div>
                      )}
                    </div>

                    <div className="text-right space-y-0.5">
                      <span className="px-2 py-0.5 rounded-md text-[10px] font-black bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                        Zéro Frais Cachés
                      </span>
                      <p className="text-[10.5px] text-slate-400">Accès immédiat garanti</p>
                    </div>
                  </div>

                  {/* Sélecteur d'Onglets Méthode : Mobile Money vs WhatsApp */}
                  <div className="flex p-1 bg-slate-950 border border-slate-800 rounded-2xl">
                    <button
                      type="button"
                      onClick={() => setActiveTab('MOMO')}
                      className={`flex-1 py-2 rounded-xl text-xs font-black transition flex items-center justify-center gap-2 ${
                        activeTab === 'MOMO'
                          ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-md'
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      <Smartphone className="w-3.5 h-3.5" />
                      <span>Mobile Money (Wave / Orange / Moov)</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setActiveTab('WHATSAPP')}
                      className={`flex-1 py-2 rounded-xl text-xs font-black transition flex items-center justify-center gap-2 ${
                        activeTab === 'WHATSAPP'
                          ? 'bg-gradient-to-r from-emerald-500 to-green-600 text-slate-950 shadow-md font-black'
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      <MessageSquare className="w-3.5 h-3.5" />
                      <span>Souscrire via WhatsApp</span>
                    </button>
                  </div>

                  {/* FORMULAIRE 1 : MOBILE MONEY */}
                  {activeTab === 'MOMO' && (
                    <form onSubmit={handleTriggerMobileMoneyPayment} className="space-y-4">
                      {/* Choix de l'opérateur */}
                      <div className="space-y-2">
                        <label className="text-xs font-bold text-slate-300">
                          Sélectionnez votre Opérateur :
                        </label>
                        <div className="grid grid-cols-2 gap-2">
                          {MOBILE_MONEY_PROVIDERS.map((provider) => {
                            const isSelected = selectedProvider.id === provider.id;
                            return (
                              <button
                                key={provider.id}
                                type="button"
                                onClick={() => setSelectedProvider(provider)}
                                className={`p-2.5 rounded-xl border text-left transition flex flex-col justify-between ${
                                  isSelected
                                    ? 'bg-slate-800 border-emerald-500 ring-1 ring-emerald-500 text-white'
                                    : 'bg-slate-950/60 border-slate-800 text-slate-300 hover:border-slate-700'
                                }`}
                              >
                                <div className="flex items-center justify-between">
                                  <span className="text-xs font-black">{provider.name}</span>
                                  {isSelected && <Check className="w-3.5 h-3.5 text-emerald-400" />}
                                </div>
                                <span className="text-[10px] text-slate-400 mt-1">
                                  {provider.feeLabel}
                                </span>
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      {/* Champs Nom et Téléphone */}
                      <div className="space-y-3">
                        <div className="space-y-1">
                          <label className="text-xs font-bold text-slate-300">Nom Complet de l&apos;Apprenant</label>
                          <input
                            type="text"
                            required
                            value={studentName}
                            onChange={(e) => setStudentName(e.target.value)}
                            placeholder="Ibrahim Pousbila Konkobo"
                            className="w-full px-3 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-xs text-white placeholder-slate-500 focus:ring-1 focus:ring-emerald-500"
                          />
                        </div>

                        <div className="space-y-1">
                          <label className="text-xs font-bold text-slate-300">Numéro Mobile Money (Débit)</label>
                          <input
                            type="tel"
                            required
                            value={phoneNumber}
                            onChange={(e) => setPhoneNumber(e.target.value)}
                            placeholder="+226 70 00 00 00"
                            className="w-full px-3 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-xs text-white font-mono placeholder-slate-500 focus:ring-1 focus:ring-emerald-500"
                          />
                        </div>
                      </div>

                      {/* Bouton de Déclenchement */}
                      <div className="pt-2">
                        <button
                          type="submit"
                          disabled={isProcessing}
                          className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-emerald-500 via-emerald-600 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-slate-950 font-black text-xs sm:text-sm shadow-xl shadow-emerald-500/25 transition disabled:opacity-60 flex items-center justify-center gap-2 cursor-pointer"
                        >
                          {isProcessing ? (
                            <>
                              <div className="w-4 h-4 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
                              <span>Envoi du prompt USSD sur votre mobile...</span>
                            </>
                          ) : (
                            <>
                              <Zap className="w-4 h-4" />
                              <span>Valider &amp; Déclencher le Paiement ({formatCFA(effectivePrice)})</span>
                            </>
                          )}
                        </button>
                      </div>
                    </form>
                  )}

                  {/* FORMULAIRE 2 : WHATSAPP DIRECT */}
                  {activeTab === 'WHATSAPP' && (
                    <div className="space-y-4 text-center py-2">
                      <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 text-emerald-400 mx-auto flex items-center justify-center border border-emerald-500/20">
                        <MessageSquare className="w-7 h-7" />
                      </div>

                      <div className="space-y-1">
                        <h4 className="text-sm font-bold text-white">
                          Souscription Assistée en Direct avec l&apos;Équipe
                        </h4>
                        <p className="text-xs text-slate-400 leading-relaxed max-w-xs mx-auto">
                          Discutez directement avec M. Ibrahim Pousbila Konkobo ou son équipe support pour payer par virement, chèque ou dépôt direct.
                        </p>
                      </div>

                      <button
                        type="button"
                        onClick={handleWhatsAppSubscription}
                        className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-emerald-500 to-green-600 hover:opacity-95 text-slate-950 font-black text-xs sm:text-sm shadow-xl shadow-emerald-500/20 transition flex items-center justify-center gap-2 cursor-pointer"
                      >
                        <MessageSquare className="w-4 h-4" />
                        <span>Ouvrir WhatsApp Business Immédiatement</span>
                      </button>
                    </div>
                  )}

                  {/* Badge de Réassurance */}
                  <div className="pt-2 border-t border-slate-800/80 flex items-center justify-center gap-4 text-[11px] text-slate-400">
                    <span className="flex items-center gap-1">
                      <Lock className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Cryptage SSL 256-Bit</span>
                    </span>
                    <span>•</span>
                    <span className="flex items-center gap-1">
                      <ShieldCheck className="w-3.5 h-3.5 text-indigo-400" />
                      <span>Conforme Réglementation BCEAO</span>
                    </span>
                  </div>
                </>
              ) : (
                /* ÉCRAN DE CONFIRMATION DE SUCCÈS */
                <div className="py-8 text-center space-y-4">
                  <div className="w-16 h-16 rounded-full bg-emerald-500/20 border-2 border-emerald-500 text-emerald-400 mx-auto flex items-center justify-center animate-bounce">
                    <CheckCircle2 className="w-9 h-9" />
                  </div>

                  <div className="space-y-1">
                    <span className="text-[10px] font-black uppercase tracking-wider text-emerald-400">
                      Paiement Confirmé avec Succès !
                    </span>
                    <h3 className="text-lg font-black text-white">
                      Félicitations, vous êtes inscrit !
                    </h3>
                    <p className="text-xs text-slate-300 max-w-xs mx-auto">
                      Votre accès à la masterclass <strong className="text-white">{course.title}</strong> est désormais débloqué à vie.
                    </p>
                  </div>

                  <div className="pt-4">
                    <button
                      type="button"
                      onClick={handleFinishAndAccess}
                      className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:opacity-95 text-slate-950 font-black text-sm shadow-xl shadow-emerald-500/30 transition flex items-center justify-center gap-2 cursor-pointer"
                    >
                      <GraduationCap className="w-5 h-5 text-slate-950" />
                      <span>Accéder à mon Tableau de Bord &amp; Commencer</span>
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        </div>
      )}

      {/* Modal Nanasore Payment Gateway Universel (Règle 3) */}
      {isNanasoreGatewayOpen && (
        <div className="fixed inset-0 z-[9999] bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="w-full max-w-xl max-h-[95vh] overflow-y-auto bg-white rounded-3xl shadow-2xl relative">
            <button
              type="button"
              onClick={() => setIsNanasoreGatewayOpen(false)}
              className="absolute top-4 right-4 z-50 p-2 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
            <NanasorePaymentGateway
              amount={effectivePrice}
              productType="digital"
              currency="FCFA"
              orderDescription={`Formation : ${course.title}`}
              defaultPhone={phoneNumber}
              isModal={true}
              onSuccess={handleNanasoreLmsSuccess}
              onCancel={() => setIsNanasoreGatewayOpen(false)}
            />
          </div>
        </div>
      )}
    </AnimatePresence>
  );
};
