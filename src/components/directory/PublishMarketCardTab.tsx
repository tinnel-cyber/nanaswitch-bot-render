import React, { useEffect, useState } from 'react';
import {
  Store,
  MapPin,
  Phone,
  Globe,
  CheckCircle2,
  Clock,
  AlertCircle,
  Loader2,
  Send,
  Sparkles,
} from 'lucide-react';
import {
  DIRECTORY_CATEGORIES,
  publishNanaMarketCard,
  getStoreMarketCard,
} from '../../services/marketDirectoryService';
import { playTapBeep, playValidationBeep, playCancelSound } from '../../utils/audio';

interface PublishMarketCardTabProps {
  app: {
    id: string;
    name?: string;
    slug?: string;
    kyc?: {
      companyName?: string;
      phone?: string;
      city?: string;
      country?: string;
    };
  };
  showToast?: (msg: string, type?: 'success' | 'error' | 'info') => void;
}

const DEFAULT_LOGO = 'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=300&auto=format&fit=crop&q=80';
const DEFAULT_BANNER = 'https://images.unsplash.com/photo-1550009158-9ebf69173e03?w=1000&auto=format&fit=crop&q=80';

export const PublishMarketCardTab: React.FC<PublishMarketCardTabProps> = ({ app, showToast }) => {
  const [storeName, setStoreName] = useState(app?.kyc?.companyName || app?.name || '');
  const [category, setCategory] = useState<string>(DIRECTORY_CATEGORIES[1]);
  const [description, setDescription] = useState('');
  const [city, setCity] = useState(app?.kyc?.city || 'Abidjan');
  const [country, setCountry] = useState(app?.kyc?.country || "Côte d'Ivoire");
  const [phone, setPhone] = useState(app?.kyc?.phone || '');
  const [whatsappPhone, setWhatsappPhone] = useState(app?.kyc?.phone || '');
  const [shopUrl, setShopUrl] = useState(app?.slug ? `https://nsore.shop/${app.slug}` : '');
  const [logoUrl, setLogoUrl] = useState(DEFAULT_LOGO);
  const [bannerImage, setBannerImage] = useState(DEFAULT_BANNER);

  const [cardStatus, setCardStatus] = useState<'none' | 'pending_approval' | 'published' | 'rejected'>('none');
  const [rejectionReason, setRejectionReason] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!app?.id) return;
    getStoreMarketCard(app.id).then((existing) => {
      if (existing) {
        setStoreName(existing.storeName || storeName);
        if (existing.category) setCategory(existing.category);
        if (existing.description) setDescription(existing.description);
        if (existing.city) setCity(existing.city);
        if (existing.country) setCountry(existing.country);
        if (existing.phone) setPhone(existing.phone);
        if (existing.whatsappPhone) setWhatsappPhone(existing.whatsappPhone);
        if (existing.shopUrl) setShopUrl(existing.shopUrl);
        if (existing.logoUrl) setLogoUrl(existing.logoUrl);
        if (existing.bannerImage) setBannerImage(existing.bannerImage);
        const st = String(existing.status || '');
        if (st === 'published' && existing.isPublic) setCardStatus('published');
        else if (st === 'rejected') {
          setCardStatus('rejected');
          setRejectionReason(existing.rejectionReason || '');
        } else {
          setCardStatus('pending_approval');
        }
      }
    });
  }, [app?.id]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!storeName.trim()) {
      playCancelSound();
      showToast?.("Veuillez renseigner le nom de votre entreprise ou carte.", 'error');
      return;
    }
    if (!phone.trim()) {
      playCancelSound();
      showToast?.("Veuillez renseigner votre numéro de téléphone / WhatsApp.", 'error');
      return;
    }

    setIsSubmitting(true);
    playTapBeep();
    try {
      await publishNanaMarketCard({
        storeId: app.id,
        storeName: storeName.trim(),
        category,
        description: description.trim() || `Boutique officielle ${storeName.trim()} sur NaNa Market.`,
        city: city.trim() || 'Abidjan',
        country: country.trim() || "Côte d'Ivoire",
        phone: phone.trim(),
        whatsappPhone: (whatsappPhone || phone).trim(),
        shopUrl: shopUrl.trim(),
        logoUrl: logoUrl.trim() || DEFAULT_LOGO,
        bannerImage: bannerImage.trim() || DEFAULT_BANNER,
        merchantType:
          category.includes('Formation') || category.includes('Coaching')
            ? 'digital_creator'
            : category.includes('Webinaire') || category.includes('Live')
              ? 'event_host'
              : 'physical_store',
      });
      setCardStatus('pending_approval');
      playValidationBeep();
      showToast?.('Carte soumise ! En attente de validation par le Super Admin avant publication sur NaNa Market.', 'success');
    } catch (err: any) {
      playCancelSound();
      showToast?.(err?.message || 'Erreur lors de la soumission de la carte.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-5">
      {/* Phrase explicative claire */}
      <div className="p-5 rounded-2xl bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 space-y-2">
        <div className="flex items-center gap-2 text-blue-900 font-black text-base">
          <Sparkles className="w-5 h-5 text-blue-600 shrink-0" />
          <h2>Publier ma carte sur NaNa Market</h2>
        </div>
        <p className="text-xs sm:text-sm text-slate-700 leading-relaxed font-medium">
          Remplissez les informations de votre boutique ou activité ci-dessous puis cliquez sur <strong>« Publier ma carte »</strong>.
          Votre fiche sera immédiatement transmise au tableau de bord <strong>Super Admin</strong> pour vérification et validation avant d'apparaître publiquement sur la place de marché NaNa Market.
        </p>
      </div>

      {/* Statut actuel de validation */}
      {cardStatus === 'pending_approval' && (
        <div className="p-4 rounded-2xl bg-amber-50 border border-amber-300 flex items-center gap-3 text-amber-900 text-xs sm:text-sm font-bold">
          <Clock className="w-5 h-5 text-amber-600 shrink-0" />
          <span>Votre carte a été soumise et est en attente de validation par le Super Admin.</span>
        </div>
      )}
      {cardStatus === 'published' && (
        <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-300 flex items-center gap-3 text-emerald-900 text-xs sm:text-sm font-bold">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          <span>Votre carte est validée et visible publiquement sur NaNa Market !</span>
        </div>
      )}
      {cardStatus === 'rejected' && (
        <div className="p-4 rounded-2xl bg-rose-50 border border-rose-300 flex items-center gap-3 text-rose-900 text-xs sm:text-sm font-bold">
          <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
          <span>Demande refusée : {rejectionReason || 'Veuillez vérifier vos informations et soumettre à nouveau.'}</span>
        </div>
      )}

      {/* Formulaire */}
      <form onSubmit={handleSubmit} className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 sm:p-6 space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Nom de la boutique / carte *</label>
            <div className="relative">
              <Store className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                required
                value={storeName}
                onChange={(e) => setStoreName(e.target.value)}
                placeholder="Ex: TechZone Abidjan"
                className="w-full pl-9 pr-3 py-2 text-sm rounded-xl border border-slate-300 focus:border-blue-500 outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Catégorie *</label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full px-3 py-2 text-sm rounded-xl border border-slate-300 focus:border-blue-500 outline-none bg-white"
            >
              {DIRECTORY_CATEGORIES.filter((c) => c !== 'Toutes les Catégories').map((cat) => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Ville *</label>
            <div className="relative">
              <MapPin className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                placeholder="Ex: Abidjan, Ouagadougou..."
                className="w-full pl-9 pr-3 py-2 text-sm rounded-xl border border-slate-300 focus:border-blue-500 outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Pays</label>
            <input
              type="text"
              value={country}
              onChange={(e) => setCountry(e.target.value)}
              placeholder="Ex: Côte d'Ivoire, Burkina Faso..."
              className="w-full px-3 py-2 text-sm rounded-xl border border-slate-300 focus:border-blue-500 outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Téléphone / WhatsApp *</label>
            <div className="relative">
              <Phone className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="tel"
                required
                value={phone}
                onChange={(e) => {
                  setPhone(e.target.value);
                  if (!whatsappPhone) setWhatsappPhone(e.target.value);
                }}
                placeholder="+225 07 00 00 00 00"
                className="w-full pl-9 pr-3 py-2 text-sm rounded-xl border border-slate-300 focus:border-blue-500 outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Lien de votre boutique</label>
            <div className="relative">
              <Globe className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                value={shopUrl}
                onChange={(e) => setShopUrl(e.target.value)}
                placeholder="https://nsore.shop/ma-boutique"
                className="w-full pl-9 pr-3 py-2 text-sm rounded-xl border border-slate-300 focus:border-blue-500 outline-none"
              />
            </div>
          </div>
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1">Description de votre activité</label>
          <textarea
            rows={3}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Décrivez vos produits, services et points forts pour les acheteurs sur NaNa Market..."
            className="w-full px-3 py-2 text-sm rounded-xl border border-slate-300 focus:border-blue-500 outline-none resize-none"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">URL du Logo</label>
            <input
              type="url"
              value={logoUrl}
              onChange={(e) => setLogoUrl(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:border-blue-500 outline-none"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">URL de la Bannière</label>
            <input
              type="url"
              value={bannerImage}
              onChange={(e) => setBannerImage(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:border-blue-500 outline-none"
            />
          </div>
        </div>

        <div className="pt-2 flex justify-end">
          <button
            type="submit"
            disabled={isSubmitting}
            className="px-6 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-black text-sm flex items-center gap-2 shadow-md transition cursor-pointer"
          >
            {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            <span>{isSubmitting ? 'Envoi en cours...' : 'Publier ma carte'}</span>
          </button>
        </div>
      </form>
    </div>
  );
};

export default PublishMarketCardTab;
