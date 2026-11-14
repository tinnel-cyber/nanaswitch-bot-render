import React, { useState } from 'react';
import {
  Gift,
  RotateCcw,
  Sparkles,
  MapPin,
  Smartphone,
  ShieldCheck,
  Check,
  Play,
  Layers,
  Info
} from 'lucide-react';
import { LockedGiftBubble, MysteryGiftProduct } from './LockedGiftBubble';
import { GeolocationCoordinatesData } from '../../../../hooks/useMysteryGiftGeolocation';

const SAMPLE_GIFT_PRODUCTS: MysteryGiftProduct[] = [
  {
    id: 'birthday-cake-royal',
    title: "Gâteau d'anniversaire Signature (Chocolat & Fraises)",
    price: 15000,
    currency: 'FCFA',
    imageUrl:
      'https://images.unsplash.com/photo-1578985545062-69928b1d9587?q=80&w=800&auto=format&fit=crop',
    merchantName: 'Pâtisserie Douceur Divine • Nanasore',
    category: 'Pâtisserie',
    deliveryEta: '15 - 20 min',
    description: 'Confection artisanale sur-mesure pour célébrer une occasion spéciale.'
  },
  {
    id: 'macarons-prestige',
    title: 'Coffret 24 Macarons Prestige',
    price: 12000,
    currency: 'FCFA',
    imageUrl:
      'https://images.unsplash.com/photo-1569864358642-9d1684040f43?q=80&w=800&auto=format&fit=crop',
    merchantName: 'Maison du Macaron • Nanasore',
    category: 'Confiserie',
    deliveryEta: '25 - 30 min',
    description: 'Sélection raffinée vanille Bourbon, pistache, caramel beurre salé.'
  },
  {
    id: 'parfum-luxe',
    title: 'Coffret Cadeau Élixir Parfumé',
    price: 25000,
    currency: 'FCFA',
    imageUrl:
      'https://images.unsplash.com/photo-1523293182086-7651a899d37f?q=80&w=800&auto=format&fit=crop',
    merchantName: 'Parfumerie Royale • Nanasore',
    category: 'Luxe & Beauté',
    deliveryEta: '30 - 45 min',
    description: 'Fragrance précieuse emballée dans son écrin velours.'
  }
];

export const MysteryGiftShowcase: React.FC = () => {
  const [selectedProductIndex, setSelectedProductIndex] = useState(0);
  const [senderName, setSenderName] = useState('Ibrahim');
  const [resetKey, setResetKey] = useState(0);
  const [lastCapturedGps, setLastCapturedGps] = useState<GeolocationCoordinatesData | null>(null);
  const [thankCount, setThankCount] = useState(0);
  const [demoNotice, setDemoNotice] = useState<string | null>(null);

  const currentProduct = SAMPLE_GIFT_PRODUCTS[selectedProductIndex];

  const handleReset = () => {
    setResetKey((prev) => prev + 1);
    setLastCapturedGps(null);
    setDemoNotice('Composant réinitialisé en état Verrouillé (Le Suspense) !');
    setTimeout(() => setDemoNotice(null), 3000);
  };

  const handleUnlocked = (coords: GeolocationCoordinatesData) => {
    setLastCapturedGps(coords);
    setDemoNotice(`GPS validé : ${coords.formattedCoords} (${coords.approximateAddress || 'Abidjan'}) !`);
    setTimeout(() => setDemoNotice(null), 4000);
  };

  const handleThank = (name: string) => {
    setThankCount((prev) => prev + 1);
    setDemoNotice(`❤️ Message de remerciement envoyé à ${name} !`);
    setTimeout(() => setDemoNotice(null), 3000);
  };

  return (
    <div className="w-full max-w-4xl mx-auto p-4 sm:p-6 space-y-6">
      {/* En-tête de démonstration */}
      <div className="bg-gradient-to-r from-pink-500 via-rose-500 to-red-600 rounded-3xl p-6 text-white shadow-xl">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/20 backdrop-blur-md text-xs font-bold uppercase tracking-wider mb-2">
              <Gift className="w-3.5 h-3.5" />
              <span>Prompt 22 • Wameet Premium UI/UX</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight">
              Mystery Gift Bubble (Cadeau Verrouillé)
            </h1>
            <p className="text-sm text-pink-100 max-w-xl mt-1">
              Bulle de chat interactive avec effet de suspense extrême (fond flou, emoji 🎁 animé), modale de consentement GPS HTML5, et retournement 3D (rotate-y-180 CSS3) pour révéler le produit et le coursier.
            </p>
          </div>

          <button
            type="button"
            onClick={handleReset}
            className="px-4 py-2.5 rounded-2xl bg-white text-rose-600 hover:bg-rose-50 font-bold text-xs sm:text-sm shadow-md transition-all active:scale-95 flex items-center gap-2 cursor-pointer shrink-0"
          >
            <RotateCcw className="w-4 h-4" />
            <span>Rejouer le Suspense</span>
          </button>
        </div>
      </div>

      {/* Notification Toast de démo */}
      {demoNotice && (
        <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs sm:text-sm font-semibold flex items-center gap-2 animate-in fade-in slide-in-from-top-2 shadow-sm">
          <Sparkles className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{demoNotice}</span>
        </div>
      )}

      {/* Panneau de contrôle & Simulateur */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Colonne gauche : Paramètres du test */}
        <div className="lg:col-span-5 space-y-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-5 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
            <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
              <Layers className="w-4 h-4 text-rose-500" />
              <span>Configuration du Cadeau</span>
            </h3>

            {/* Expéditeur */}
            <div>
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                Expéditeur (senderName) :
              </label>
              <input
                type="text"
                value={senderName}
                onChange={(e) => setSenderName(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm font-medium focus:ring-2 focus:ring-rose-500 outline-none transition-all"
                placeholder="Ex: Ibrahim"
              />
            </div>

            {/* Choix du produit réel révélé */}
            <div>
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1.5">
                Produit physique Nanasore :
              </label>
              <div className="space-y-2">
                {SAMPLE_GIFT_PRODUCTS.map((prod, idx) => (
                  <button
                    key={prod.id}
                    type="button"
                    onClick={() => {
                      setSelectedProductIndex(idx);
                      handleReset();
                    }}
                    className={`w-full text-left p-3 rounded-2xl border transition-all flex items-center gap-3 cursor-pointer ${
                      selectedProductIndex === idx
                        ? 'border-rose-500 bg-rose-50/70 dark:bg-rose-950/30 text-rose-900 dark:text-rose-200 shadow-xs'
                        : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50'
                    }`}
                  >
                    <img
                      src={prod.imageUrl}
                      alt={prod.title}
                      className="w-12 h-12 rounded-xl object-cover shrink-0"
                    />
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-bold truncate">{prod.title}</p>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                        {prod.merchantName} • {Number(prod.price).toLocaleString()} {prod.currency}
                      </p>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Statut GPS capturé en direct */}
            {lastCapturedGps && (
              <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 space-y-1">
                <p className="text-xs font-black text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-rose-500" />
                  <span>Données GPS acquises :</span>
                </p>
                <p className="text-xs text-slate-600 dark:text-slate-400 font-mono">
                  {lastCapturedGps.formattedCoords} (Précision: ±{lastCapturedGps.accuracy}m)
                </p>
                <p className="text-[11px] text-slate-500">
                  {lastCapturedGps.isSimulated ? '⚡ Simulation Test' : '🛰️ API HTML5 Réelle'}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Colonne droite : Aperçu dans un flux de discussion de smartphone Wameet */}
        <div className="lg:col-span-7 flex flex-col items-center">
          <div className="w-full max-w-[380px] rounded-[36px] bg-slate-100 dark:bg-slate-950 border-[6px] border-slate-800 dark:border-slate-700 shadow-2xl p-4 overflow-hidden relative min-h-[580px] flex flex-col">
            {/* Encoche Smartphone */}
            <div className="w-32 h-4 bg-slate-800 rounded-full mx-auto mb-3" />

            {/* En-tête de chat Wameet */}
            <div className="px-3 py-2 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex items-center justify-between mb-4 shadow-xs">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-rose-500 to-pink-500 text-white font-bold flex items-center justify-center text-xs">
                  {senderName.charAt(0)}
                </div>
                <div>
                  <h4 className="text-xs font-black text-slate-900 dark:text-white leading-tight">
                    {senderName}
                  </h4>
                  <p className="text-[10px] text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    En ligne sur Wameet
                  </p>
                </div>
              </div>
              <span className="text-[10px] font-bold text-slate-400">12:34</span>
            </div>

            {/* Corps du chat avec message d'introduction */}
            <div className="flex-1 flex flex-col justify-end space-y-3 pb-2">
              {/* Message texte de l'expéditeur */}
              <div className="self-start max-w-[80%] p-3 rounded-2xl rounded-tl-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs text-slate-800 dark:text-slate-200 shadow-xs">
                Devine quoi ! Je t'ai préparé une surprise physique pour marquer le coup 🥳🎉
              </div>

              {/* COMPOSANT DU CADEAU VERROUILLÉ (PROMPT 22) */}
              <div className="self-start">
                <LockedGiftBubble
                  key={resetKey}
                  senderName={senderName}
                  giftProduct={currentProduct}
                  onUnlocked={handleUnlocked}
                  onThankSender={handleThank}
                  onTrackDelivery={(coords) => {
                    setDemoNotice(`🛵 Suivi live du coursier vers ${coords?.formattedCoords || 'votre position'} !`);
                  }}
                  timestamp="12:35"
                />
              </div>
            </div>

            {/* Barre de saisie factice */}
            <div className="mt-2 pt-2 border-t border-slate-200 dark:border-slate-800/80 flex items-center gap-2">
              <div className="flex-1 py-2 px-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs text-slate-400">
                Écrire un message...
              </div>
              <div className="w-8 h-8 rounded-xl bg-blue-600 text-white flex items-center justify-center text-xs font-bold">
                ➤
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MysteryGiftShowcase;
