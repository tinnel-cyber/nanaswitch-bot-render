import React, { useState } from 'react';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../../../firebase';
import { X, Upload, Check, Sparkles } from 'lucide-react';
import { playValidationBeep } from '../../../../utils/audio';

export interface CreatePostModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUserId: string;
}

export type PostType = 'PRODUCT_POST' | 'AD_POST' | 'IDEA_POST';

export const CreatePostModal: React.FC<CreatePostModalProps> = ({ isOpen, onClose, currentUserId }) => {
  const [activeType, setActiveType] = useState<PostType>('PRODUCT_POST');
  
  // Champs communs & spécifiques
  const [title, setTitle] = useState('');
  const [price, setPrice] = useState('');
  const [mediaUrl, setMediaUrl] = useState('');
  const [content, setContent] = useState('');
  const [targetUrl, setTargetUrl] = useState('');
  const [shopUrl, setShopUrl] = useState('');
  const [actionButtonText, setActionButtonText] = useState('En savoir plus');
  const [sector, setSector] = useState('');
  const [contact, setContact] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [uploadSuccess, setUploadSuccess] = useState(false);

  if (!isOpen) return null;

  const handleImageFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result) {
          setMediaUrl(event.target.result as string);
          setUploadSuccess(true);
          setTimeout(() => setUploadSuccess(false), 2500);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const resetForm = () => {
    setTitle('');
    setPrice('');
    setMediaUrl('');
    setContent('');
    setTargetUrl('');
    setShopUrl('');
    setActionButtonText('En savoir plus');
    setSector('');
    setContact('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      await addDoc(collection(db, 'social_feed_posts'), {
        type: activeType,
        creatorId: currentUserId || 'wameet_user',
        title: activeType !== 'IDEA_POST' ? title.trim() : (title.trim() || null),
        priceXOF: activeType === 'PRODUCT_POST' ? Number(price) : null,
        mediaUrl: activeType !== 'IDEA_POST' ? mediaUrl.trim() : null,
        content: content.trim(),
        targetUrl: activeType === 'AD_POST' ? targetUrl.trim() : (shopUrl.trim() || null),
        shopUrl: activeType === 'PRODUCT_POST' ? (shopUrl.trim() || null) : null,
        actionButtonText: activeType === 'AD_POST' ? (actionButtonText.trim() || 'En savoir plus') : null,
        sector: activeType === 'IDEA_POST' ? (sector.trim() || null) : null,
        contact: activeType === 'IDEA_POST' ? (contact.trim() || null) : null,
        resonanceCount: 0,
        commentCount: 0,
        shareCount: 0,
        createdAt: serverTimestamp()
      });

      playValidationBeep();
      alert('Publication créée avec succès sur le Feed !');
      resetForm();
      onClose();
    } catch (err: any) {
      console.error('Erreur création publication :', err);
      alert('Erreur lors de la publication : ' + (err?.message || 'Vérifiez votre connexion'));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-md max-h-[90vh] overflow-y-auto bg-gray-900 border border-gray-800 rounded-3xl p-5 text-white shadow-2xl space-y-4">
        {/* En-tête avec bouton de fermeture */}
        <div className="flex justify-between items-center border-b border-gray-800 pb-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-amber-500/10 text-amber-400 flex items-center justify-center">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-extrabold text-amber-400">Créer une Publication</h3>
              <p className="text-[10px] text-gray-400">Affiche & Idée • Formats Wameet</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-full bg-gray-800 text-gray-400 hover:text-white hover:bg-gray-700 transition cursor-pointer"
            aria-label="Fermer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Choix des 3 Formats sous forme d'onglets propres */}
        <div className="grid grid-cols-3 gap-1.5 bg-gray-800/60 p-1 rounded-2xl border border-gray-700/50 text-[11px] font-bold">
          <button
            type="button"
            onClick={() => setActiveType('PRODUCT_POST')}
            className={`py-2 px-1 rounded-xl transition-all cursor-pointer text-center ${
              activeType === 'PRODUCT_POST'
                ? 'bg-amber-500 text-gray-900 shadow-md font-extrabold'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            📦 Produit
          </button>
          <button
            type="button"
            onClick={() => setActiveType('AD_POST')}
            className={`py-2 px-1 rounded-xl transition-all cursor-pointer text-center ${
              activeType === 'AD_POST'
                ? 'bg-blue-600 text-white shadow-md font-extrabold'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            📢 Publicité
          </button>
          <button
            type="button"
            onClick={() => setActiveType('IDEA_POST')}
            className={`py-2 px-1 rounded-xl transition-all cursor-pointer text-center ${
              activeType === 'IDEA_POST'
                ? 'bg-emerald-600 text-white shadow-md font-extrabold'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            💡 Idée / Statut
          </button>
        </div>

        {/* Formulaire dynamique selon l'onglet choisi */}
        <form onSubmit={handleSubmit} className="space-y-3">
          {activeType !== 'IDEA_POST' && (
            <div>
              <label className="block text-[11px] text-gray-400 mb-1 font-medium">Titre de l'Affiche</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
                placeholder={activeType === 'PRODUCT_POST' ? 'Ex: Montre Connectée VIP' : 'Ex: Offre Spéciale Lancement'}
                className="w-full bg-gray-800 text-xs px-3 py-2 rounded-xl border border-gray-700 focus:outline-none focus:border-amber-500 text-white placeholder-gray-500"
              />
            </div>
          )}

          {activeType === 'PRODUCT_POST' && (
            <>
              <div>
                <label className="block text-[11px] text-gray-400 mb-1 font-medium">Prix (FCFA)</label>
                <input
                  type="number"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  required
                  placeholder="15000"
                  className="w-full bg-gray-800 text-xs px-3 py-2 rounded-xl border border-gray-700 focus:outline-none focus:border-amber-500 text-white placeholder-gray-500"
                />
              </div>

              <div>
                <label className="block text-[11px] text-gray-400 mb-1 font-medium">Lien Boutique Nanasore (optionnel)</label>
                <input
                  type="url"
                  value={shopUrl}
                  onChange={(e) => setShopUrl(e.target.value)}
                  placeholder="https://boutique.nsore.shop/produit/123"
                  className="w-full bg-gray-800 text-xs px-3 py-2 rounded-xl border border-gray-700 focus:outline-none focus:border-amber-500 text-white placeholder-gray-500"
                />
              </div>
            </>
          )}

          {activeType === 'AD_POST' && (
            <>
              <div>
                <label className="block text-[11px] text-gray-400 mb-1 font-medium">Lien Cible (URL Sponsor)</label>
                <input
                  type="url"
                  value={targetUrl}
                  onChange={(e) => setTargetUrl(e.target.value)}
                  placeholder="https://nsore.shop/promo"
                  className="w-full bg-gray-800 text-xs px-3 py-2 rounded-xl border border-gray-700 focus:outline-none focus:border-blue-500 text-white placeholder-gray-500"
                />
              </div>

              <div>
                <label className="block text-[11px] text-gray-400 mb-1 font-medium">Texte du Bouton d'Action</label>
                <input
                  type="text"
                  value={actionButtonText}
                  onChange={(e) => setActionButtonText(e.target.value)}
                  placeholder="Ex: Acheter, En savoir plus, Profiter"
                  className="w-full bg-gray-800 text-xs px-3 py-2 rounded-xl border border-gray-700 focus:outline-none focus:border-blue-500 text-white placeholder-gray-500"
                />
              </div>
            </>
          )}

          {activeType === 'IDEA_POST' && (
            <>
              <div>
                <label className="block text-[11px] text-gray-400 mb-1 font-medium">Secteur d'activité</label>
                <input
                  type="text"
                  value={sector}
                  onChange={(e) => setSector(e.target.value)}
                  placeholder="Ex: Agroalimentaire, Fintech, Mode, Logistique"
                  className="w-full bg-gray-800 text-xs px-3 py-2 rounded-xl border border-gray-700 focus:outline-none focus:border-emerald-500 text-white placeholder-gray-500"
                />
              </div>

              <div>
                <label className="block text-[11px] text-gray-400 mb-1 font-medium">Contact WhatsApp / Téléphone</label>
                <input
                  type="text"
                  value={contact}
                  onChange={(e) => setContact(e.target.value)}
                  placeholder="Ex: +226 70 00 00 00"
                  className="w-full bg-gray-800 text-xs px-3 py-2 rounded-xl border border-gray-700 focus:outline-none focus:border-emerald-500 text-white placeholder-gray-500"
                />
              </div>
            </>
          )}

          {activeType !== 'IDEA_POST' && (
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-[11px] text-gray-400 font-medium">
                  {activeType === 'PRODUCT_POST' ? "URL de l'Affiche (Image)" : "Bannière (Image)"}
                </label>
                <label
                  htmlFor="create-post-image-upload"
                  className="text-[10px] text-amber-400 hover:text-amber-300 font-bold flex items-center gap-1 cursor-pointer"
                >
                  <Upload className="w-3 h-3" />
                  {uploadSuccess ? 'Image choisie !' : 'Charger une image'}
                </label>
              </div>
              <input
                type="file"
                id="create-post-image-upload"
                accept="image/*"
                onChange={handleImageFileChange}
                className="hidden"
              />
              <input
                type="text"
                value={mediaUrl}
                onChange={(e) => setMediaUrl(e.target.value)}
                required
                placeholder="https://nsore-video-storage.s3.../affiche.jpg ou choisir image"
                className="w-full bg-gray-800 text-xs px-3 py-2 rounded-xl border border-gray-700 focus:outline-none focus:border-amber-500 text-white placeholder-gray-500"
              />
              {mediaUrl && (
                <div className="mt-2 relative w-full h-28 rounded-xl overflow-hidden border border-gray-700 bg-black/40">
                  <img src={mediaUrl} alt="Aperçu" className="w-full h-full object-cover" />
                </div>
              )}
            </div>
          )}

          <div>
            <label className="block text-[11px] text-gray-400 mb-1 font-medium">
              {activeType === 'IDEA_POST' ? "Votre Idée d'affaires ou opportunité" : "Description courte"}
            </label>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              rows={3}
              required={activeType === 'IDEA_POST'}
              placeholder={
                activeType === 'IDEA_POST'
                  ? "Ex: Recherche partenaire pour distribution de jus locaux à Ouaga..."
                  : "Détails de l'offre..."
              }
              className="w-full bg-gray-800 text-xs px-3 py-2 rounded-xl border border-gray-700 focus:outline-none focus:border-amber-500 text-white placeholder-gray-500 resize-none"
            />
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className={`w-full py-3 font-extrabold text-xs rounded-xl shadow-lg transition-all cursor-pointer flex items-center justify-center gap-2 ${
              activeType === 'PRODUCT_POST'
                ? 'bg-gradient-to-r from-amber-500 to-amber-600 text-gray-900 hover:from-amber-400 hover:to-amber-500'
                : activeType === 'AD_POST'
                ? 'bg-gradient-to-r from-blue-600 to-blue-700 text-white hover:from-blue-500 hover:to-blue-600'
                : 'bg-gradient-to-r from-emerald-500 to-emerald-600 text-white hover:from-emerald-400 hover:to-emerald-500'
            }`}
          >
            {isLoading ? (
              <span>Publication en cours...</span>
            ) : (
              <>
                <Check className="w-4 h-4" />
                <span>Publier sur le Feed Wameet</span>
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
};

export default CreatePostModal;
