import React, { useState, useEffect } from 'react';
import {
  Zap,
  MessageCircle,
  QrCode,
  Image as ImageIcon,
  Lock,
  Unlock,
  Key,
  Send,
  Mic,
  Copy,
  Check,
  ExternalLink,
  Share2,
  Sparkles,
  ShieldCheck,
  ArrowLeft,
  Globe,
  ShoppingBag,
  Film,
  Home
} from 'lucide-react';
import { WameetLogo } from '../../../components/wameet/WameetLogo';
import { playTapBeep, playValidationBeep } from '../../../utils/audio';

export interface WameetIsolatedExtensionAppProps {
  onOpenMainWameet?: () => void;
}

type ExtensionTabId = 'CLIPPER' | 'QUICK_CHAT' | 'QR_GENERATOR' | 'IMAGE_HOST';

export const WameetIsolatedExtensionApp: React.FC<WameetIsolatedExtensionAppProps> = ({
  onOpenMainWameet
}) => {
  const [activeTab, setActiveTab] = useState<ExtensionTabId>('CLIPPER');

  // Clé Personnelle Wameet (wameet_live_...)
  const [personalKey, setPersonalKey] = useState<string>(() => {
    try {
      return localStorage.getItem('wameet_personal_live_key') || 'wameet_live_984a7c2e19b04f88d1';
    } catch (e) {
      return 'wameet_live_984a7c2e19b04f88d1';
    }
  });
  const [keyCopied, setKeyCopied] = useState<boolean>(false);

  // Code PIN à 4 chiffres Optionnel
  const [isPinLocked, setIsPinLocked] = useState<boolean>(false);
  const [savedPin, setSavedPin] = useState<string>(() => {
    try {
      return localStorage.getItem('wameet_isolated_pin') || '';
    } catch (e) {
      return '';
    }
  });
  const [pinEntry, setPinEntry] = useState<string>('');
  const [pinError, setPinError] = useState<string>('');

  // 1. ⚡ 1-Click Link Clipper
  const [clipDestination, setClipDestination] = useState<'WALL' | 'REELS' | 'SHOP'>('WALL');
  const [clipUrl, setClipUrl] = useState<string>('https://www.youtube.com/watch?v=aqz-KE-bpKQ');
  const [clipTitle, setClipTitle] = useState<string>('');
  const [clipPriceFcfa, setClipPriceFcfa] = useState<string>('15000');

  // 2. 💬 Accès Rapide Messages SMS & Audio Wameet
  const [selectedChatMember, setSelectedChatMember] = useState<string>('Awa Ouédraogo (@awa.empire.bf)');
  const [quickMessages, setQuickMessages] = useState<
    Array<{ id: string; sender: 'me' | 'them'; text: string; time: string }>
  >([
    {
      id: 'qm-1',
      sender: 'them',
      text: 'Bonsoir ! Bienvenue dans ton Extension Isolée Wameet 🌐 Envoie-moi un SMS ou une Note Vocale rapide !',
      time: '19:45'
    }
  ]);
  const [quickSmsInput, setQuickSmsInput] = useState<string>('');

  // 3. 🔗 Générateur de Lien de Profil & Mini-Shop + QR Code Wameet
  const [wameetSpaceUrl, setWameetSpaceUrl] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      return `${window.location.origin}/wameet`;
    }
    return 'https://pos-app-1759a.web.app/wameet';
  });
  const [spaceLinkCopied, setSpaceLinkCopied] = useState<boolean>(false);

  // 4. 🖼️ Raccourci vers Lien Direct Image
  const [testedDirectImageUrl, setTestedDirectImageUrl] = useState<string>('');

  // Toast
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 3200);
  };

  useEffect(() => {
    try {
      localStorage.setItem('wameet_personal_live_key', personalKey);
    } catch (e) {}
  }, [personalKey]);

  // Publication 1-Click Link Clipper directement synchronisée avec Wameet (Mur, Reels ou Mini-Shop)
  const handlePublishClip = (e: React.FormEvent) => {
    e.preventDefault();
    if (!clipUrl.trim()) return;
    playValidationBeep();

    try {
      if (clipDestination === 'WALL') {
        const rawPosts = localStorage.getItem('wameet_posts_v1');
        const posts = rawPosts ? JSON.parse(rawPosts) : [];
        const isVideo =
          clipUrl.includes('youtube.com') ||
          clipUrl.includes('youtu.be') ||
          clipUrl.endsWith('.mp4');
        const newPost = {
          id: `post-clip-${Date.now()}`,
          authorName: 'Entrepreneur Wameet',
          authorHandle: '@entrepreneur.wameet',
          authorAvatar:
            'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=300&auto=format&fit=crop&q=80',
          authorBadge: '🧩 Publié via Extension Wameet',
          isOnline: true,
          createdAt: "À l'instant",
          content:
            clipTitle.trim() ||
            `Découverte partagée en 1 clic depuis mon Extension Isolée Wameet 🌐 : ${clipUrl}`,
          mediaType: isVideo ? 'video' : 'image',
          mediaUrl: clipUrl.trim(),
          likesCount: 1,
          lovesCount: 1,
          ideasCount: 1,
          sharesCount: 0,
          userReaction: 'idea',
          comments: []
        };
        localStorage.setItem('wameet_posts_v1', JSON.stringify([newPost, ...posts]));
        showToast('✅ Lien publié instantanément sur votre Mur Facebook Wameet !');
      } else if (clipDestination === 'REELS') {
        const rawReels = localStorage.getItem('wameet_reels_tiktok_v1');
        const reels = rawReels ? JSON.parse(rawReels) : [];
        const newReel = {
          id: `reel-clip-${Date.now()}`,
          authorName: 'Entrepreneur Wameet',
          authorHandle: '@entrepreneur.wameet',
          authorAvatar:
            'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=300&auto=format&fit=crop&q=80',
          authorBadge: '🧩 Extension Wameet',
          isFollowing: true,
          videoUrl: clipUrl.trim(),
          title: clipTitle.trim() || 'Reel partagé en 1 clic via Extension Wameet 🎬',
          description: 'Publié depuis le 1-Click Link Clipper Wameet (/wameet/app).',
          hashtags: ['#WameetClipper', '#WameetReels', '#Afterwork'],
          audioTrackName: 'Son Original • Wameet Clipper',
          category: 'FOR_YOU',
          likesCount: 1,
          isLiked: true,
          bookmarksCount: 0,
          isBookmarked: false,
          sharesCount: 0,
          comments: [],
          createdAt: "À l'instant"
        };
        localStorage.setItem('wameet_reels_tiktok_v1', JSON.stringify([newReel, ...reels]));
        showToast('🎬 Vidéo publiée en 1 clic dans Wameet Reels (TikTok) !');
      } else if (clipDestination === 'SHOP') {
        const rawShop = localStorage.getItem('wameet_mini_shop_products_v1');
        const shopList = rawShop ? JSON.parse(rawShop) : [];
        const newProd = {
          id: `wshop-clip-${Date.now()}`,
          category: 'PHYSICAL',
          title: clipTitle.trim() || 'Produit Express Wameet Clipper',
          priceFcfa: Number(clipPriceFcfa) || 15000,
          description: 'Publié en 1 clic depuis l’Extension Isolée Wameet.',
          imageUrl: clipUrl.trim(),
          sellerName: 'Entrepreneur Wameet',
          sellerHandle: '@entrepreneur.wameet',
          sellerAvatar:
            'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=300&auto=format&fit=crop&q=80',
          sellerBadge: '🧩 Extension Wameet',
          isMine: true,
          createdAt: "À l'instant"
        };
        localStorage.setItem('wameet_mini_shop_products_v1', JSON.stringify([newProd, ...shopList]));
        showToast('🛍️ Produit publié en 1 clic dans votre Mini-Shop Wameet !');
      }
    } catch (err) {}

    setClipTitle('');
  };

  // Envoi rapide SMS ou Audio depuis l'Extension
  const handleSendQuickSms = (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickSmsInput.trim()) return;
    playValidationBeep();
    const now = new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
    setQuickMessages(prev => [
      ...prev,
      { id: `qm-${Date.now()}`, sender: 'me', text: `${quickSmsInput.trim()} ✓✓`, time: now }
    ]);
    setQuickSmsInput('');
    showToast(`💬 SMS envoyé à ${selectedChatMember}`);
  };

  const handleSendQuickVoice = () => {
    playValidationBeep();
    const now = new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
    setQuickMessages(prev => [
      ...prev,
      {
        id: `qv-${Date.now()}`,
        sender: 'me',
        text: '🎙️ Note vocale envoyée (0:14) • Ondes sonores 1x ✓✓',
        time: now
      }
    ]);
    showToast(`🎙️ Note vocale envoyée à ${selectedChatMember}`);
  };

  // Clavier PIN 4 chiffres
  const handlePinDigit = (digit: string) => {
    playTapBeep();
    if (pinEntry.length >= 4) return;
    const next = pinEntry + digit;
    setPinEntry(next);
    setPinError('');

    if (next.length === 4) {
      setTimeout(() => {
        if (!savedPin) {
          setSavedPin(next);
          try {
            localStorage.setItem('wameet_isolated_pin', next);
          } catch (e) {}
          setPinEntry('');
          setIsPinLocked(false);
          showToast('🔒 Code PIN Wameet à 4 chiffres enregistré !');
        } else if (next === savedPin) {
          setPinEntry('');
          setIsPinLocked(false);
          showToast('🔓 Extension Wameet déverrouillée !');
        } else {
          setPinEntry('');
          setPinError('Code PIN incorrect. Réessayez.');
        }
      }, 150);
    }
  };

  const qrImageUrl = `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(
    wameetSpaceUrl
  )}&margin=10&color=2563eb&bgcolor=ffffff`;

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 via-white to-blue-50/70 text-slate-900 py-6 px-4 flex flex-col items-center justify-center relative">
      {/* Notification Toast */}
      {toastMsg && (
        <div className="fixed top-6 left-1/2 -translate-x-1/2 z-50 px-5 py-2.5 rounded-full bg-[#2563EB] text-white text-xs font-black shadow-2xl border-2 border-white flex items-center gap-2 animate-bounce">
          <Sparkles className="w-4 h-4 shrink-0" />
          <span>{toastMsg}</span>
        </div>
      )}

      {/* =====================================================================
          CHÂSSIS ISOLÉ "ZERO-TRUST SANDBOX" WAMEET (/wameet/app)
         ===================================================================== */}
      <div className="w-full max-w-md rounded-[36px] border-2 border-[#2563EB] ring-4 ring-blue-500/15 bg-white shadow-[0_20px_60px_-10px_rgba(37,99,235,0.35)] overflow-hidden relative">
        {/* En-tête Bleu Nuit Royal & Blanc Pur avec Logo Officiel Wameet (image_2.png) */}
        <header className="px-5 py-4 bg-gradient-to-r from-[#04102E] via-[#091E4C] to-[#0D2B6B] border-b-2 border-[#2563EB] text-white flex items-center justify-between">
          <WameetLogo
            size="sm"
            showWordmark={true}
            showTagline={true}
            layout="horizontal"
            theme="on-dark"
          />

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => {
                playTapBeep();
                setPinEntry('');
                setIsPinLocked(true);
              }}
              className="px-2.5 py-1.5 rounded-xl bg-white/15 hover:bg-white/25 text-white text-[11px] font-black border border-white/40 flex items-center gap-1 cursor-pointer"
              title="Verrouiller par Code PIN à 4 chiffres"
            >
              <Lock className="w-3.5 h-3.5" />
              <span>PIN</span>
            </button>

            <button
              type="button"
              onClick={() => {
                playTapBeep();
                if (onOpenMainWameet) {
                  onOpenMainMainWameetFallback();
                } else if (typeof window !== 'undefined') {
                  window.location.href = '/wameet';
                }
              }}
              className="px-2.5 py-1.5 rounded-xl bg-white text-[#2563EB] text-[11px] font-black shadow-xs cursor-pointer"
            >
              /wameet
            </button>
          </div>
        </header>

        {/* ÉCRAN DE VERROUILLAGE CODE PIN 4 CHIFFRES OPTIONNEL AVEC LOGO OFFICIEL WAMEET */}
        {isPinLocked && (
          <div className="absolute inset-0 z-40 bg-gradient-to-b from-[#04102E] via-[#081C4A] to-[#04102E] text-white flex flex-col items-center justify-center p-6 text-center">
            <div className="mb-3">
              <WameetLogo
                size="lg"
                showWordmark={true}
                showTagline={true}
                layout="vertical"
                theme="on-dark"
              />
            </div>
            <h2 className="text-sm font-black text-blue-100 mt-1">
              {savedPin ? '🔒 Extension Wameet Verrouillée' : '🔒 Créer un Code PIN Optionnel (4 chiffres)'}
            </h2>
            <p className="text-[11px] text-blue-200/80 mt-0.5">
              Protection Zero-Trust de votre espace personnel Wameet
            </p>

            <div className="flex items-center gap-3 my-4">
              {[0, 1, 2, 3].map(idx => (
                <span
                  key={idx}
                  className={`w-4 h-4 rounded-full border-2 border-[#38BDF8] transition ${
                    idx < pinEntry.length ? 'bg-[#2563EB] scale-110 shadow-[0_0_10px_#38BDF8]' : 'bg-white/20'
                  }`}
                />
              ))}
            </div>

            {pinError && (
              <div className="text-xs font-black text-rose-600 mb-2">{pinError}</div>
            )}

            <div className="grid grid-cols-3 gap-2.5 w-60">
              {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map(d => (
                <button
                  key={d}
                  type="button"
                  onClick={() => handlePinDigit(d)}
                  className="py-3 rounded-2xl bg-blue-50 hover:bg-[#2563EB] text-slate-900 hover:text-white border-2 border-blue-200 font-black text-sm transition cursor-pointer"
                >
                  {d}
                </button>
              ))}
              <button
                type="button"
                onClick={() => setPinEntry('')}
                className="py-3 rounded-2xl bg-slate-100 text-slate-700 font-black text-xs cursor-pointer"
              >
                Effacer
              </button>
              <button
                type="button"
                onClick={() => handlePinDigit('0')}
                className="py-3 rounded-2xl bg-blue-50 hover:bg-[#2563EB] text-slate-900 hover:text-white border-2 border-blue-200 font-black text-sm transition cursor-pointer"
              >
                0
              </button>
              <button
                type="button"
                onClick={() => setIsPinLocked(false)}
                className="py-3 rounded-2xl bg-emerald-50 text-emerald-700 border border-emerald-300 font-black text-xs cursor-pointer"
              >
                Ignorer
              </button>
            </div>
          </div>
        )}

        {/* Barre des 4 Outils de l'Extension Isolée Wameet */}
        <nav className="grid grid-cols-4 gap-1.5 p-2.5 bg-blue-50/80 border-b-2 border-blue-100">
          <button
            type="button"
            onClick={() => {
              playTapBeep();
              setActiveTab('CLIPPER');
            }}
            className={`py-2 px-1 rounded-2xl text-[10px] font-black transition cursor-pointer flex flex-col items-center gap-1 ${
              activeTab === 'CLIPPER'
                ? 'bg-[#2563EB] text-white shadow-md'
                : 'bg-white text-slate-700 hover:bg-blue-100/60'
            }`}
          >
            <Zap className="w-4 h-4" />
            <span>1. Clipper</span>
          </button>

          <button
            type="button"
            onClick={() => {
              playTapBeep();
              setActiveTab('QUICK_CHAT');
            }}
            className={`py-2 px-1 rounded-2xl text-[10px] font-black transition cursor-pointer flex flex-col items-center gap-1 ${
              activeTab === 'QUICK_CHAT'
                ? 'bg-[#2563EB] text-white shadow-md'
                : 'bg-white text-slate-700 hover:bg-blue-100/60'
            }`}
          >
            <MessageCircle className="w-4 h-4" />
            <span>2. SMS/Audio</span>
          </button>

          <button
            type="button"
            onClick={() => {
              playTapBeep();
              setActiveTab('QR_GENERATOR');
            }}
            className={`py-2 px-1 rounded-2xl text-[10px] font-black transition cursor-pointer flex flex-col items-center gap-1 ${
              activeTab === 'QR_GENERATOR'
                ? 'bg-[#2563EB] text-white shadow-md'
                : 'bg-white text-slate-700 hover:bg-blue-100/60'
            }`}
          >
            <QrCode className="w-4 h-4" />
            <span>3. QR & Lien</span>
          </button>

          <button
            type="button"
            onClick={() => {
              playTapBeep();
              setActiveTab('IMAGE_HOST');
            }}
            className={`py-2 px-1 rounded-2xl text-[10px] font-black transition cursor-pointer flex flex-col items-center gap-1 ${
              activeTab === 'IMAGE_HOST'
                ? 'bg-[#2563EB] text-white shadow-md'
                : 'bg-white text-slate-700 hover:bg-blue-100/60'
            }`}
          >
            <ImageIcon className="w-4 h-4" />
            <span>4. Images</span>
          </button>
        </nav>

        {/* Corps de l'Extension */}
        <div className="p-5 space-y-4">
          {/* =================================================================
              ⚡ 1. "1-CLICK LINK CLIPPER" (PARTAGE INSTANTANÉ DEPUIS N'IMPORTE OÙ)
             ================================================================= */}
          {activeTab === 'CLIPPER' && (
            <div className="space-y-4">
              <form
                onSubmit={handlePublishClip}
                className="rounded-[26px] border-2 border-blue-200 p-4 bg-white shadow-xs space-y-3"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black text-[#2563EB] uppercase tracking-wider">
                    ⚡ 1-Click Link Clipper
                  </span>
                  <span className="px-2 py-0.5 rounded-full bg-blue-50 text-[#2563EB] text-[10px] font-black">
                    Publication Directe
                  </span>
                </div>

                <div>
                  <label className="block text-[10px] font-black text-slate-600 uppercase mb-1.5">
                    Où publier ce lien sur Wameet ?
                  </label>
                  <div className="grid grid-cols-3 gap-1.5">
                    <button
                      type="button"
                      onClick={() => setClipDestination('WALL')}
                      className={`py-2 px-2 rounded-xl text-[11px] font-black border-2 transition cursor-pointer ${
                        clipDestination === 'WALL'
                          ? 'bg-[#2563EB] text-white border-[#2563EB]'
                          : 'bg-slate-50 text-slate-700 border-blue-200'
                      }`}
                    >
                      🏠 Mon Mur
                    </button>
                    <button
                      type="button"
                      onClick={() => setClipDestination('REELS')}
                      className={`py-2 px-2 rounded-xl text-[11px] font-black border-2 transition cursor-pointer ${
                        clipDestination === 'REELS'
                          ? 'bg-[#2563EB] text-white border-[#2563EB]'
                          : 'bg-slate-50 text-slate-700 border-blue-200'
                      }`}
                    >
                      🎬 Reels
                    </button>
                    <button
                      type="button"
                      onClick={() => setClipDestination('SHOP')}
                      className={`py-2 px-2 rounded-xl text-[11px] font-black border-2 transition cursor-pointer ${
                        clipDestination === 'SHOP'
                          ? 'bg-[#2563EB] text-white border-[#2563EB]'
                          : 'bg-slate-50 text-slate-700 border-blue-200'
                      }`}
                    >
                      🛍️ Mini-Shop
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-black text-slate-600 uppercase mb-1">
                    Lien à partager (YouTube, TikTok, Image, Produit...)
                  </label>
                  <input
                    type="url"
                    required
                    value={clipUrl}
                    onChange={e => setClipUrl(e.target.value)}
                    placeholder="https://..."
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border-2 border-blue-200 focus:border-[#2563EB] text-xs font-semibold text-slate-900 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-black text-slate-600 uppercase mb-1">
                    Titre / Idée après le travail
                  </label>
                  <textarea
                    rows={2}
                    value={clipTitle}
                    onChange={e => setClipTitle(e.target.value)}
                    placeholder="Wa-Meet ! Découvrez cette vidéo / ce produit..."
                    className="w-full px-3.5 py-2 rounded-xl bg-slate-50 border-2 border-blue-200 focus:border-[#2563EB] text-xs font-medium text-slate-900 focus:outline-none"
                  />
                </div>

                {clipDestination === 'SHOP' && (
                  <div>
                    <label className="block text-[10px] font-black text-slate-600 uppercase mb-1">
                      Prix du Produit (FCFA)
                    </label>
                    <input
                      type="number"
                      value={clipPriceFcfa}
                      onChange={e => setClipPriceFcfa(e.target.value)}
                      className="w-full px-3.5 py-2 rounded-xl bg-slate-50 border-2 border-blue-200 text-xs font-black text-[#2563EB]"
                    />
                  </div>
                )}

                <button
                  type="submit"
                  className="w-full py-3 rounded-2xl bg-[#2563EB] hover:bg-blue-700 text-white text-xs font-black shadow-lg cursor-pointer"
                >
                  🚀 Publier en 1 Clic sur Wameet
                </button>
              </form>

              {/* Clé Personnelle Wameet (wameet_live_...) */}
              <div className="rounded-[24px] border-2 border-blue-200 p-3.5 bg-blue-50/50 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-black text-slate-800 flex items-center gap-1.5">
                    <Key className="w-3.5 h-3.5 text-[#2563EB]" />
                    <span>Clé Personnelle Isolée Wameet</span>
                  </span>
                  <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700">
                    🟢 Active
                  </span>
                </div>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={personalKey}
                    onChange={e => setPersonalKey(e.target.value)}
                    className="flex-1 px-3 py-2 rounded-xl bg-white border border-blue-300 text-xs font-mono font-bold text-[#2563EB]"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard?.writeText(personalKey);
                      setKeyCopied(true);
                      setTimeout(() => setKeyCopied(false), 2000);
                      showToast('🔑 Clé personnelle wameet_live_ copiée !');
                    }}
                    className="px-3 py-2 rounded-xl bg-[#2563EB] text-white text-xs font-black cursor-pointer shrink-0"
                  >
                    {keyCopied ? 'Copiée' : 'Copier'}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* =================================================================
              💬 2. ACCÈS RAPIDE À SES MESSAGES SMS & AUDIO WAMEET
             ================================================================= */}
          {activeTab === 'QUICK_CHAT' && (
            <div className="rounded-[26px] border-2 border-blue-200 p-4 bg-white space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black text-[#2563EB] uppercase">
                  💬 SMS & Audio Rapides Wameet
                </span>
                <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-[10px] font-black">
                  🟢 Sans ouvrir l'app mère
                </span>
              </div>

              <select
                value={selectedChatMember}
                onChange={e => setSelectedChatMember(e.target.value)}
                className="w-full px-3.5 py-2 rounded-xl bg-blue-50 border-2 border-blue-200 text-xs font-black text-[#2563EB]"
              >
                <option value="Awa Ouédraogo (@awa.empire.bf)">
                  🟢 Awa Ouédraogo • 🛍️ Commerçante
                </option>
                <option value="Dr. Idriss Kaboré (@idriss.academie)">
                  🟢 Dr. Idriss Kaboré • 🎓 Formateur
                </option>
                <option value="Salif Tech (@salif.tech.ci)">
                  🟢 Salif Tech • 🚀 Entrepreneur
                </option>
                <option value="Clarisse Zongo (@clarisse.coach)">
                  🟢 Clarisse Zongo • 🌙 Détente
                </option>
              </select>

              <div className="max-h-52 overflow-y-auto space-y-2 p-2.5 rounded-2xl bg-slate-50 border border-blue-100">
                {quickMessages.map(m => (
                  <div
                    key={m.id}
                    className={`p-2.5 rounded-2xl text-xs font-medium ${
                      m.sender === 'me'
                        ? 'bg-[#2563EB] text-white ml-8 rounded-tr-none'
                        : 'bg-white border border-blue-200 text-slate-800 mr-8 rounded-tl-none'
                    }`}
                  >
                    <div>{m.text}</div>
                    <div
                      className={`text-[9px] text-right mt-0.5 ${
                        m.sender === 'me' ? 'text-blue-100' : 'text-slate-400'
                      }`}
                    >
                      {m.time}
                    </div>
                  </div>
                ))}
              </div>

              <form onSubmit={handleSendQuickSms} className="space-y-2">
                <input
                  type="text"
                  value={quickSmsInput}
                  onChange={e => setQuickSmsInput(e.target.value)}
                  placeholder="Écrire un SMS rapide..."
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border-2 border-blue-200 focus:border-[#2563EB] text-xs font-semibold"
                />
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="submit"
                    className="py-2.5 rounded-xl bg-[#2563EB] hover:bg-blue-700 text-white text-xs font-black flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>Envoyer SMS</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleSendQuickVoice}
                    className="py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <Mic className="w-3.5 h-3.5" />
                    <span>🎙️ Note Vocale</span>
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* =================================================================
              🔗 3. GÉNÉRATEUR DE LIEN DE PROFIL & MINI-SHOP + QR CODE WAMEET
             ================================================================= */}
          {activeTab === 'QR_GENERATOR' && (
            <div className="rounded-[26px] border-2 border-blue-200 p-4 bg-white space-y-3 text-center">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black text-[#2563EB] uppercase">
                  🔗 Lien Profil & Mini-Shop + QR Code
                </span>
                <span className="px-2 py-0.5 rounded-full bg-blue-50 text-[#2563EB] text-[10px] font-black">
                  Partage 1-Clic
                </span>
              </div>

              <input
                type="text"
                value={wameetSpaceUrl}
                onChange={e => setWameetSpaceUrl(e.target.value)}
                className="w-full px-3.5 py-2 rounded-xl bg-slate-50 border-2 border-blue-200 text-xs font-bold text-[#2563EB] text-center"
              />

              <div className="p-4 rounded-2xl border-2 border-dashed border-[#2563EB] bg-blue-50/40 inline-block mx-auto">
                <img
                  src={qrImageUrl}
                  alt="QR Code Wameet"
                  className="w-40 h-40 rounded-2xl border-2 border-[#2563EB] bg-white p-1.5 mx-auto shadow-md"
                />
                <p className="text-[10px] font-black text-[#2563EB] mt-2">
                  📲 Scannez en face-à-face pour ouvrir mon Mur & Mini-Shop Wameet
                </p>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard?.writeText(wameetSpaceUrl);
                    setSpaceLinkCopied(true);
                    setTimeout(() => setSpaceLinkCopied(false), 2000);
                    showToast('📋 Lien Wameet copié !');
                  }}
                  className="py-2.5 rounded-xl bg-[#2563EB] hover:bg-blue-700 text-white text-xs font-black cursor-pointer"
                >
                  {spaceLinkCopied ? '✅ Lien Copié !' : '📋 Copier le Lien'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const text = `🌐 Retrouve-moi sur Wameet (Mur d'idées, Reels & Mini-Shop) : ${wameetSpaceUrl}`;
                    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
                  }}
                  className="py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black cursor-pointer"
                >
                  📲 Partager WhatsApp
                </button>
              </div>
            </div>
          )}

          {/* =================================================================
              🖼️ 4. RACCOURCI INTÉGRÉ VERS CONVERTISSEUR IMAGE
             ================================================================= */}
          {activeTab === 'IMAGE_HOST' && (
            <div className="rounded-[26px] border-2 border-blue-200 p-4 bg-white space-y-3.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black text-[#2563EB] uppercase">
                  🖼️ Convertisseur Image &rarr; Lien Direct
                </span>
                <span className="px-2 py-0.5 rounded-full bg-blue-50 text-[#2563EB] text-[10px] font-black">
                  Zéro Upload Lourd
                </span>
              </div>

              <div className="p-3 rounded-2xl bg-blue-50/90 border border-blue-200 text-xs text-slate-700 leading-relaxed">
                💡 <strong>Image sur votre téléphone ou trop lourde ?</strong> Obtenez un lien direct sur{' '}
                <a
                  href="https://postimages.org/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-black text-[#2563EB] underline"
                >
                  Postimages.org
                </a>
                , copiez le <strong>"Lien Direct" (Direct Link)</strong> et collez-le ici !
              </div>

              <div className="flex justify-center">
                <a
                  href="https://postimages.org/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full py-2.5 px-3 rounded-xl bg-[#2563EB] hover:bg-blue-700 text-white text-xs font-black text-center flex items-center justify-center gap-1 shadow-md"
                >
                  <span>Ouvrir Postimages.org</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </div>

              <div>
                <label className="block text-[10px] font-black text-slate-600 uppercase mb-1">
                  Coller votre Lien Direct Image pour l'utiliser dans le Clipper :
                </label>
                <input
                  type="url"
                  value={testedDirectImageUrl}
                  onChange={e => setTestedDirectImageUrl(e.target.value)}
                  placeholder="https://i.postimg.cc/..."
                  className="w-full px-3.5 py-2 rounded-xl bg-slate-50 border-2 border-blue-200 text-xs font-semibold"
                />
              </div>

              <button
                type="button"
                onClick={() => {
                  if (testedDirectImageUrl.trim()) {
                    setClipUrl(testedDirectImageUrl.trim());
                  }
                  setActiveTab('CLIPPER');
                  showToast('🖼️ Lien Direct chargé dans le 1-Click Clipper !');
                }}
                className="w-full py-2.5 rounded-xl bg-blue-50 hover:bg-blue-100 text-[#2563EB] border border-blue-300 text-xs font-black cursor-pointer"
              >
                ✨ Envoyer ce lien dans le 1-Click Clipper
              </button>
            </div>
          )}
        </div>

        {/* Pied de page avec lien vers l'extension Chrome popup.html et /wameet */}
        <footer className="px-5 py-3 bg-blue-50/90 border-t border-blue-200 flex items-center justify-between text-[11px] font-black text-[#2563EB]">
          <a
            href="/wameet-extension/popup.html"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:underline flex items-center gap-1"
          >
            <span>🧩 Extension PC (popup.html)</span>
            <ExternalLink className="w-3 h-3" />
          </a>
          <button
            type="button"
            onClick={() => {
              if (onOpenMainWameet) {
                onOpenMainWameet();
              } else if (typeof window !== 'undefined') {
                window.location.href = '/wameet';
              }
            }}
            className="hover:underline cursor-pointer"
          >
            Retour à Wameet Supra-App &rarr;
          </button>
        </footer>
      </div>
    </div>
  );

  function onOpenMainMainWameetFallback() {
    if (onOpenMainWameet) onOpenMainWameet();
  }
};

export default WameetIsolatedExtensionApp;
