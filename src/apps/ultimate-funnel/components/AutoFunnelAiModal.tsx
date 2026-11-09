import React, { useState, useRef, useCallback } from 'react';
import { Sparkles, Upload, Mic, MicOff, X, ArrowRight, CheckCircle2, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { uploadMediaToStorage } from '../../../firebase';
import { PhysicalFunnelBlock, PhysicalFunnelConfig, DEFAULT_PHYSICAL_FUNNEL_BLOCKS } from '../../../types/physicalFunnel';
import { playTapBeep, playValidationBeep } from '../../../utils/audio';

interface AutoFunnelAiModalProps {
  isOpen: boolean;
  onClose: () => void;
  onFunnelGenerated: (config: PhysicalFunnelConfig) => void;
}

export const AutoFunnelAiModal: React.FC<AutoFunnelAiModalProps> = ({
  isOpen,
  onClose,
  onFunnelGenerated
}) => {
  const [productName, setProductName] = useState('Casque Bluetooth Sans Fil Pro');
  const [description, setDescription] = useState('Casque audio sans fil haute fidélité avec réduction active du bruit et autonomie record.');
  const [priceCFA, setPriceCFA] = useState(35000);
  const [originalPriceCFA, setOriginalPriceCFA] = useState(50000);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string>('');
  const [isRecording, setIsRecording] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationStep, setGenerationStep] = useState('');

  const recognitionRef = useRef<any>(null);

  if (!isOpen) return null;

  // Dictée vocale de la description
  const toggleVoiceDictation = () => {
    playTapBeep();
    const SpeechRec = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRec) {
      alert('La reconnaissance vocale n\'est pas supportée dans ce navigateur.');
      return;
    }

    if (isRecording) {
      if (recognitionRef.current) recognitionRef.current.stop();
      setIsRecording(false);
    } else {
      try {
        const rec = new SpeechRec();
        rec.lang = 'fr-FR';
        rec.continuous = true;
        rec.interimResults = true;
        rec.onresult = (e: any) => {
          let text = '';
          for (let i = e.resultIndex; i < e.results.length; i++) {
            text += e.results[i][0].transcript;
          }
          if (text) setDescription(prev => `${prev} ${text}`.trim());
        };
        rec.onerror = () => setIsRecording(false);
        rec.onend = () => setIsRecording(false);
        rec.start();
        recognitionRef.current = rec;
        setIsRecording(true);
      } catch (err) {
        console.warn('Voice dictation error:', err);
      }
    }
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImageFile(file);
    const localUrl = URL.createObjectURL(file);
    setImagePreview(localUrl);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    playValidationBeep();
    setIsGenerating(true);
    setGenerationStep("Téléversement et analyse du produit...");

    let uploadedImageUrl = imagePreview;

    try {
      if (imageFile) {
        // Upload avec timeout de 2.5s maximum pour ne jamais bloquer l'utilisateur
        const uploadPromise = uploadMediaToStorage(imageFile, `funnels/products/${Date.now()}_${imageFile.name}`);
        const timeoutPromise = new Promise<string>((_, reject) => setTimeout(() => reject(new Error('timeout')), 2500));
        try {
          uploadedImageUrl = await Promise.race([uploadPromise, timeoutPromise]);
        } catch {
          uploadedImageUrl = imagePreview;
        }
      }

      setGenerationStep('NaNa AI rédige votre page de vente (Framework AIDA)...');

      // Tentative d'appel API avec timeout de 4 secondes
      let generatedBlocks: PhysicalFunnelBlock[] | null = null;
      let brandColor = '#10b981';

      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 4000);

        const response = await fetch('/api/ai/auto-funnel/generate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          signal: controller.signal,
          body: JSON.stringify({
            productName,
            description,
            priceCFA,
            originalPriceCFA,
            imageUrl: uploadedImageUrl
          })
        });

        clearTimeout(timeoutId);

        if (response.ok) {
          const result = await response.json();
          if (result.success && Array.isArray(result.blocks) && result.blocks.length > 0) {
            generatedBlocks = result.blocks;
            if (result.brandColor) brandColor = result.brandColor;
          }
        }
      } catch (err) {
        console.warn('[AutoFunnelAI] Bascule sur la génération locale AIDA:', err);
      }

      // Si l'API n'a pas répondu ou en mode hors-ligne, génération locale immédiate
      if (!generatedBlocks) {
        const discountPct = Math.max(10, Math.round(((originalPriceCFA - priceCFA) / originalPriceCFA) * 100));
        generatedBlocks = [
          {
            id: `block_hero_${Date.now()}`,
            type: 'HERO_PRODUCT',
            title: 'Hero Vitrine Standard CRO',
            visible: true,
            props: {
              headline: `${productName} : L'Élégance & la Précision au Quotidien`,
              subheadline: description || 'Commandez en direct au tarif promotionnel et bénéficiez de la livraison express.',
              badgeText: 'VENTE FLASH EXCLUSIVE • STOCK LIMITÉ',
              price: priceCFA,
              originalPrice: originalPriceCFA,
              discountBadge: `-${discountPct}% AUJOURD'HUI`,
              ctaText: 'Commander avec Wave / Orange Money',
              imageUrl: uploadedImageUrl || 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=600&q=80'
            }
          },
          {
            id: `block_scarcity_${Date.now()}`,
            type: 'SCARCITY_URGENCY',
            title: 'Jauge Rareté & Compte à Rebours',
            visible: true,
            props: {
              totalStock: 30,
              remainingStock: 7,
              hoursLeft: 3,
              urgencyText: 'Plus que 7 exemplaires disponibles à ce tarif promotionnel !'
            }
          },
          {
            id: `block_benefits_${Date.now()}`,
            type: 'BENEFITS_LIST',
            title: 'Avantages Clés AIDA',
            visible: true,
            props: {
              headline: 'Ce qui rend ce produit unique :',
              bullets: [
                { title: 'Qualité Supérieure Certifiée', desc: 'Matériaux nobles garantis contre l\'usure du temps.' },
                { title: 'Livraison Express Sous 4H', desc: 'Reçu en main propre et inspecté avant de régler.' },
                { title: 'Garantie Totale NaNa', desc: 'Échange immédiat en boutique en cas de défaut.' }
              ]
            }
          },
          {
            id: `block_flash_live_${Date.now()}`,
            type: 'FLASH_LIVE_CTA',
            title: 'Bouton Concierge WebRTC',
            visible: true,
            props: {
              buttonText: '👁️ Voir le produit en direct (Visio 5 min)',
              badgeText: 'VENDEUR DISPONIBLE EN BOUTIQUE',
              merchantPhone: '+22507000000'
            }
          },
          {
            id: `block_trust_${Date.now()}`,
            type: 'TRUST_BADGES',
            title: 'Badges de Confiance',
            visible: true,
            props: {
              badges: [
                'Paiement 100% Sécurisé Wave & Orange Money',
                'Livraison Express & Sécurisée',
                'Garantie Satisfait ou Remboursé'
              ]
            }
          },
          {
            id: `block_mini_market_${Date.now()}`,
            type: 'MINI_MARKET_DRAWER',
            title: 'Mini-Market Express (Auto-composition)',
            visible: true,
            props: {
              buttonText: 'Explorer le Mini-Market',
              badgeText: 'Auto-composition',
              headline: 'Complétez votre commande avec le Mini-Market',
              subheadline: 'Ajoutez des articles et accessoires complémentaires directement.',
              floatingButtonEnabled: true
            }
          },
          {
            id: `block_checkout_${Date.now()}`,
            type: 'INLINE_CHECKOUT',
            title: 'Caisse Intégrée',
            visible: true,
            props: {
              heading: 'Finalisez votre commande en 1 minute',
              subheading: 'Paiement sans contact ou règlement à la livraison'
            }
          },
          {
            id: `block_fomo_${Date.now()}`,
            type: 'LIVE_SALE_TOAST',
            title: 'Preuve Sociale FOMO',
            visible: true,
            props: {
              intervalSeconds: 12,
              enabled: true
            }
          }
        ];
      }

      const slug = (productName.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-').slice(0, 25)) || 'offre-exclusive';

      const generatedConfig: PhysicalFunnelConfig = {
        id: `funnel_${Date.now()}`,
        slug,
        productId: `prod_${Date.now()}`,
        title: productName,
        brandColor,
        blocks: generatedBlocks,
        ogMetadata: {
          title: productName,
          description: description ? description.slice(0, 150) : productName,
          imageUrl: uploadedImageUrl,
          priceAmount: priceCFA,
          currency: 'FCFA'
        },
        isPublished: false,
        createdAt: Date.now(),
        updatedAt: Date.now()
      };

      onFunnelGenerated(generatedConfig);
      onClose();
    } catch (criticalErr) {
      console.error('[AutoFunnelAI] Erreur fatale génération:', criticalErr);
      alert('Une erreur est survenue. Veuillez vérifier les champs et réessayer.');
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-md animate-fadeIn">
      <div 
        className="w-full max-w-xl max-h-[90vh] flex flex-col rounded-3xl bg-slate-900 border border-slate-800 shadow-2xl text-slate-100 relative overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Entête Figée */}
        <div className="p-5 sm:p-6 border-b border-slate-800 flex items-center justify-between shrink-0 bg-slate-950/60">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-emerald-500 to-indigo-500 flex items-center justify-center text-white shadow-md">
                <Sparkles className="w-4 h-4" />
              </div>
              <h2 className="text-lg sm:text-xl font-black text-white">NaNa Auto-Funnel AI</h2>
            </div>
            <p className="text-xs text-slate-400">
              Générez une page de vente complète haute conversion en 1 clic grâce à notre IA copywriter.
            </p>
          </div>

          {/* Fermer */}
          <button
            type="button"
            onClick={onClose}
            disabled={isGenerating}
            className="p-2 rounded-xl bg-slate-800 text-slate-400 hover:text-white cursor-pointer transition shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Corps Défilable */}
        <div className="flex-1 overflow-y-auto overscroll-contain p-5 sm:p-6 space-y-6 touch-pan-y custom-scrollbar">

        {isGenerating ? (
          <div className="py-12 flex flex-col items-center justify-center text-center space-y-4">
            <div className="relative w-16 h-16">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-50" />
              <div className="w-16 h-16 rounded-full bg-gradient-to-tr from-emerald-500 to-indigo-600 flex items-center justify-center text-white shadow-xl shadow-emerald-500/40">
                <Sparkles className="w-8 h-8 animate-spin" />
              </div>
            </div>
            <div className="space-y-1">
              <h3 className="text-sm font-black text-white">{generationStep}</h3>
              <p className="text-xs text-slate-400">Optimisation des déclencheurs psychologiques et blocs CRO...</p>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Nom du Produit */}
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-300">Nom du Produit :</label>
              <input
                type="text"
                value={productName}
                onChange={(e) => setProductName(e.target.value)}
                required
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-emerald-500"
                placeholder="Ex: Montre Chronographe Quartz"
              />
            </div>

            {/* Description Brute + Bouton Micro */}
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-300">Description Brute / Points Forts :</label>
                <button
                  type="button"
                  onClick={toggleVoiceDictation}
                  className={`text-[11px] font-bold px-2 py-0.5 rounded-lg flex items-center gap-1 cursor-pointer transition ${
                    isRecording
                      ? 'bg-rose-500/20 text-rose-300 border border-rose-500 animate-pulse'
                      : 'bg-slate-800 text-slate-400 hover:text-white'
                  }`}
                >
                  {isRecording ? <MicOff className="w-3 h-3 text-rose-400" /> : <Mic className="w-3 h-3 text-emerald-400" />}
                  <span>{isRecording ? 'Arrêter dictée' : 'Dicter à la voix'}</span>
                </button>
              </div>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                required
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-emerald-500"
                placeholder="Décrivez librement le produit : matière, bénéfices, garantie..."
              />
            </div>

            {/* Prix Promo et Prix Barré */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-300">Prix Promo (F CFA) :</label>
                <input
                  type="number"
                  value={priceCFA}
                  onChange={(e) => setPriceCFA(Number(e.target.value))}
                  required
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white font-mono focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-300">Prix d'Origine Barré (F CFA) :</label>
                <input
                  type="number"
                  value={originalPriceCFA}
                  onChange={(e) => setOriginalPriceCFA(Number(e.target.value))}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white font-mono focus:outline-none focus:border-emerald-500"
                />
              </div>
            </div>

            {/* Zone Upload Photo */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-300">Photo du Produit :</label>
              <div className="flex items-center gap-4">
                <img
                  src={imagePreview}
                  alt="Aperçu"
                  className="w-16 h-16 rounded-2xl object-cover border border-slate-800 shrink-0"
                />
                <label className="flex-1 p-3 rounded-2xl border-2 border-dashed border-slate-800 hover:border-emerald-500/50 bg-slate-950/60 cursor-pointer flex flex-col items-center justify-center gap-1 transition">
                  <Upload className="w-5 h-5 text-emerald-400" />
                  <span className="text-xs text-slate-300 font-bold">Choisir une image</span>
                  <span className="text-[10px] text-slate-500">PNG, JPG ou WebP</span>
                  <input type="file" accept="image/*" onChange={handleImageChange} className="hidden" />
                </label>
              </div>
            </div>

            {/* Bouton Soumettre */}
            <button
              type="submit"
              className="w-full py-4 px-6 bg-gradient-to-r from-emerald-600 via-emerald-500 to-indigo-600 hover:from-emerald-500 hover:to-indigo-500 active:scale-98 text-white font-black text-sm rounded-2xl shadow-xl shadow-emerald-950/60 flex items-center justify-center gap-2 transition cursor-pointer mt-4"
            >
              <Sparkles className="w-4 h-4 text-amber-300" />
              <span>Générer Ma Page de Vente Haute Conversion</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>
        )}
      </div>
    </div>
  </div>
);
};

export default AutoFunnelAiModal;
