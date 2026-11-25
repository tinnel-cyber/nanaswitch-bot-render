import React, { useState, useRef, useEffect, useCallback } from 'react';
import { 
  Bold, Italic, Underline, Heading2, Heading3, 
  List, ListOrdered, Palette, Highlighter, Tag, 
  Sparkles, Eye, Edit3, Wand2, Check, RotateCcw,
  AlignLeft, AlignCenter, AlignRight, Image as ImageIcon,
  Link2, Video, Share2, ExternalLink
} from 'lucide-react';
import { playTapBeep, playValidationBeep } from '../../../../utils/audio';
import { sanitizeRichHtml } from '../../../../utils/security';

interface RichTextEditorProps {
  value: string;
  onChange: (htmlValue: string) => void;
  placeholder?: string;
  minHeight?: string;
}

// Couleurs e-commerce préréglées selon les instructions
const ECOMMERCE_COLORS = [
  { name: 'Vert Émeraude (Garantie / Fraîcheur)', hex: '#10b981', border: '#059669' },
  { name: 'Orange Solaire (Promo / Alerte)', hex: '#f97316', border: '#ea580c' },
  { name: 'Indigo Moderne (Titres / Marque)', hex: '#6366f1', border: '#4f46e5' },
  { name: 'Ambre Doré (Prestige / Qualité)', hex: '#f59e0b', border: '#d97706' },
  { name: 'Rouge Corail (Urgence / Flash)', hex: '#ef4444', border: '#dc2626' },
  { name: 'Blanc Pur (Corps clair)', hex: '#f8fafc', border: '#e2e8f0' },
  { name: 'Gris Cendré (Subtil)', hex: '#94a3b8', border: '#64748b' },
];

// Nuances de surlignage
const HIGHLIGHT_COLORS = [
  { name: 'Jaune Fluo', bg: 'rgba(234, 179, 8, 0.35)', border: '#eab308', text: '#fef08a' },
  { name: 'Vert Menthe', bg: 'rgba(16, 185, 129, 0.35)', border: '#10b981', text: '#a7f3d0' },
  { name: 'Orange Doux', bg: 'rgba(249, 115, 22, 0.35)', border: '#f97316', text: '#fed7aa' },
  { name: 'Indigo Pastel', bg: 'rgba(99, 102, 241, 0.35)', border: '#6366f1', text: '#c7d2fe' },
];

// Badges stylisés préconçus pour l'e-commerce africain
const PRESET_BADGES = [
  { 
    label: '🌿 100% Naturel', 
    color: '#10b981', 
    bg: 'rgba(16, 185, 129, 0.18)', 
    border: 'rgba(16, 185, 129, 0.4)' 
  },
  { 
    label: '⚡ Stock Limité', 
    color: '#f97316', 
    bg: 'rgba(249, 115, 22, 0.18)', 
    border: 'rgba(249, 115, 22, 0.4)' 
  },
  { 
    label: '📍 Origine Locale', 
    color: '#6366f1', 
    bg: 'rgba(99, 102, 241, 0.18)', 
    border: 'rgba(99, 102, 241, 0.4)' 
  },
  { 
    label: '⭐ Qualité Supérieure', 
    color: '#f59e0b', 
    bg: 'rgba(245, 158, 11, 0.18)', 
    border: 'rgba(245, 158, 11, 0.4)' 
  },
  { 
    label: '🚚 Livraison Express 30m', 
    color: '#38bdf8', 
    bg: 'rgba(56, 189, 248, 0.18)', 
    border: 'rgba(56, 189, 248, 0.4)' 
  },
];

// Modèle de description riche professionnel
const TEMPLATE_EXAMPLE = `<h2>✨ Points Forts & Avantages</h2>
<p><span style="display:inline-block; padding:2px 9px; border-radius:9999px; font-size:10.5px; font-weight:800; color:#10b981; background-color:rgba(16, 185, 129, 0.18); border:1px solid rgba(16, 185, 129, 0.4); margin-right:4px;">🌿 100% Naturel</span> <span style="display:inline-block; padding:2px 9px; border-radius:9999px; font-size:10.5px; font-weight:800; color:#6366f1; background-color:rgba(99, 102, 241, 0.18); border:1px solid rgba(99, 102, 241, 0.4); margin-right:4px;">📍 Origine Locale</span></p>
<p>Sélection de première qualité choisie avec soin pour vous apporter fraîcheur et authenticité au quotidien.</p>
<h3>📦 Caractéristiques</h3>
<ul>
  <li><strong>Format & Conditionnement :</strong> Emballage protecteur hermétique</li>
  <li><strong>Disponibilité :</strong> <span style="color:#10b981; font-weight:bold;">En stock immédiat</span></li>
  <li><strong>Conseil de conservation :</strong> À conserver dans un endroit sec et frais</li>
</ul>
<p><mark style="background-color:rgba(234, 179, 8, 0.35); color:#fef08a; padding:3px 8px; border-radius:6px; font-weight:bold;">🚚 Livraison express en 30 minutes sur toute la ville !</mark></p>`;

export const RichTextEditor: React.FC<RichTextEditorProps> = ({
  value,
  onChange,
  placeholder = "Rédigez ici la description détaillée du produit...",
  minHeight = "160px"
}) => {
  const editorRef = useRef<HTMLDivElement>(null);
  const [activeTab, setActiveTab] = useState<'edit' | 'preview'>('edit');
  const [showColorPalette, setShowColorPalette] = useState(false);
  const [showHighlightPalette, setShowHighlightPalette] = useState(false);
  const [showBadgesMenu, setShowBadgesMenu] = useState(false);
  const [showLinkMenu, setShowLinkMenu] = useState(false);
  const [showImageMenu, setShowImageMenu] = useState(false);
  const [showVideoMenu, setShowVideoMenu] = useState(false);
  const [showSocialMenu, setShowSocialMenu] = useState(false);

  const [linkUrlInput, setLinkUrlInput] = useState('');
  const [linkTextInput, setLinkTextInput] = useState('');
  const [imageUrlInput, setImageUrlInput] = useState('');
  const [videoUrlInput, setVideoUrlInput] = useState('');
  const [selectedSocialId, setSelectedSocialId] = useState('whatsapp');
  const [socialUrlInput, setSocialUrlInput] = useState('');

  const savedRangeRef = useRef<Range | null>(null);
  const [selectedColor, setSelectedColor] = useState('#10b981');
  const [isUpdatingFromProps, setIsUpdatingFromProps] = useState(false);

  const closeAllMenus = () => {
    setShowColorPalette(false);
    setShowHighlightPalette(false);
    setShowBadgesMenu(false);
    setShowLinkMenu(false);
    setShowImageMenu(false);
    setShowVideoMenu(false);
    setShowSocialMenu(false);
  };

  const saveSelection = () => {
    const sel = window.getSelection();
    if (sel && sel.rangeCount > 0) {
      savedRangeRef.current = sel.getRangeAt(0).cloneRange();
      const text = sel.toString().trim();
      if (text) setLinkTextInput(text);
    }
  };

  const restoreSelection = () => {
    if (editorRef.current) editorRef.current.focus();
    const sel = window.getSelection();
    if (sel && savedRangeRef.current) {
      sel.removeAllRanges();
      sel.addRange(savedRangeRef.current);
    }
  };

  // Synchronisation initiale du contenu
  useEffect(() => {
    if (editorRef.current && !isUpdatingFromProps) {
      if (editorRef.current.innerHTML !== value) {
        editorRef.current.innerHTML = value || '';
      }
    }
  }, [value, isUpdatingFromProps]);

  // Sauvegarde et notification du parent
  const handleInput = useCallback(() => {
    if (editorRef.current) {
      setIsUpdatingFromProps(true);
      const html = editorRef.current.innerHTML;
      onChange(html);
      setTimeout(() => setIsUpdatingFromProps(false), 50);
    }
  }, [onChange]);

  // Exécution de commande de formatage sécurisée
  const executeCommand = (command: string, arg: string | undefined = undefined) => {
    playTapBeep();
    if (editorRef.current) {
      editorRef.current.focus();
    }
    document.execCommand(command, false, arg);
    handleInput();
  };

  // Insertion d'un badge stylisé
  const insertBadge = (badge: typeof PRESET_BADGES[0]) => {
    playTapBeep();
    if (editorRef.current) {
      editorRef.current.focus();
    }
    const badgeHtml = `&nbsp;<span style="display:inline-block; padding:2px 9px; border-radius:9999px; font-size:10.5px; font-weight:800; color:${badge.color}; background-color:${badge.bg}; border:1px solid ${badge.border}; margin-right:4px;">${badge.label}</span>&nbsp;`;
    document.execCommand('insertHTML', false, badgeHtml);
    setShowBadgesMenu(false);
    handleInput();
  };

  // Application de la couleur de texte
  const applyTextColor = (hexColor: string) => {
    playTapBeep();
    setSelectedColor(hexColor);
    executeCommand('foreColor', hexColor);
    setShowColorPalette(false);
  };

  // Application du surlignage
  const applyHighlight = (hl: typeof HIGHLIGHT_COLORS[0]) => {
    playTapBeep();
    if (editorRef.current) {
      editorRef.current.focus();
    }
    const selection = window.getSelection();
    if (selection && selection.toString()) {
      const text = selection.toString();
      const highlightHtml = `<mark style="background-color:${hl.bg}; color:${hl.text}; padding:2px 6px; border-radius:4px; font-weight:bold;">${text}</mark>`;
      document.execCommand('insertHTML', false, highlightHtml);
    } else {
      const highlightHtml = `&nbsp;<mark style="background-color:${hl.bg}; color:${hl.text}; padding:2px 6px; border-radius:4px; font-weight:bold;">Argument clé</mark>&nbsp;`;
      document.execCommand('insertHTML', false, highlightHtml);
    }
    setShowHighlightPalette(false);
    handleInput();
  };

  const fileInputRef = useRef<HTMLInputElement>(null);

  const SOCIAL_NETWORKS = [
    { id: 'whatsapp', name: 'WhatsApp', emoji: '💬', bg: '#16a34a', placeholder: 'https://wa.me/226...' },
    { id: 'facebook', name: 'Facebook', emoji: '📘', bg: '#2563eb', placeholder: 'https://facebook.com/...' },
    { id: 'instagram', name: 'Instagram', emoji: '📸', bg: '#db2777', placeholder: 'https://instagram.com/...' },
    { id: 'tiktok', name: 'TikTok', emoji: '🎵', bg: '#0f172a', placeholder: 'https://tiktok.com/@...' },
    { id: 'youtube', name: 'YouTube', emoji: '▶️', bg: '#dc2626', placeholder: 'https://youtube.com/@...' },
    { id: 'x', name: 'X / Twitter', emoji: '𝕏', bg: '#1e293b', placeholder: 'https://x.com/...' },
    { id: 'linkedin', name: 'LinkedIn', emoji: '💼', bg: '#0284c7', placeholder: 'https://linkedin.com/in/...' },
    { id: 'telegram', name: 'Telegram', emoji: '✈️', bg: '#0ea5e9', placeholder: 'https://t.me/...' }
  ];

  const handleInsertLinkConfirm = () => {
    const rawUrl = linkUrlInput.trim();
    if (!rawUrl) return;
    const finalUrl = /^https?:\/\//i.test(rawUrl) || rawUrl.startsWith('mailto:') || rawUrl.startsWith('tel:')
      ? rawUrl
      : `https://${rawUrl}`;
    playValidationBeep();
    restoreSelection();
    const sel = window.getSelection();
    const selectedText = sel?.toString().trim() || linkTextInput.trim() || finalUrl;
    const linkHtml = `<a href="${finalUrl}" target="_blank" rel="noopener noreferrer" style="color:#38bdf8; text-decoration:underline; font-weight:700;">${selectedText}</a>`;
    document.execCommand('insertHTML', false, linkHtml);
    setLinkUrlInput('');
    setLinkTextInput('');
    setShowLinkMenu(false);
    handleInput();
  };

  const handleInsertImageUrlConfirm = () => {
    const url = imageUrlInput.trim();
    if (!url) return;
    playValidationBeep();
    restoreSelection();
    const imgHtml = `<p><img src="${url}" alt="Illustration produit" style="max-width:100%; height:auto; border-radius:14px; margin:8px 0; box-shadow:0 4px 6px -1px rgba(0,0,0,0.1);" /></p><p><br></p>`;
    document.execCommand('insertHTML', false, imgHtml);
    setImageUrlInput('');
    setShowImageMenu(false);
    handleInput();
  };

  const handleInsertVideoConfirm = () => {
    const rawUrl = videoUrlInput.trim();
    if (!rawUrl) return;
    playValidationBeep();
    restoreSelection();

    let embedHtml = '';
    const ytMatch = rawUrl.match(/(?:youtube\.com\/(?:watch\?v=|shorts\/|embed\/)|youtu\.be\/)([A-Za-z0-9_-]{6,})/);
    const vimeoMatch = rawUrl.match(/vimeo\.com\/(\d+)/);

    if (ytMatch?.[1]) {
      embedHtml = `<div style="position:relative;padding-bottom:56.25%;height:0;overflow:hidden;border-radius:14px;margin:10px 0;"><iframe src="https://www.youtube.com/embed/${ytMatch[1]}" style="position:absolute;top:0;left:0;width:100%;height:100%;border:0;" allowfullscreen></iframe></div><p><br></p>`;
    } else if (vimeoMatch?.[1]) {
      embedHtml = `<div style="position:relative;padding-bottom:56.25%;height:0;overflow:hidden;border-radius:14px;margin:10px 0;"><iframe src="https://player.vimeo.com/video/${vimeoMatch[1]}" style="position:absolute;top:0;left:0;width:100%;height:100%;border:0;" allowfullscreen></iframe></div><p><br></p>`;
    } else if (/\.(mp4|webm|ogg)(\?.*)?$/i.test(rawUrl)) {
      embedHtml = `<p><video src="${rawUrl}" controls style="width:100%;max-height:380px;border-radius:14px;margin:10px 0;background:#000;"></video></p><p><br></p>`;
    } else {
      embedHtml = `<p><a href="${rawUrl}" target="_blank" rel="noopener noreferrer" style="display:inline-flex;align-items:center;gap:6px;padding:8px 14px;border-radius:12px;background:#dc2626;color:#ffffff;font-weight:800;font-size:13px;text-decoration:none;">▶️ Regarder la vidéo</a></p><p><br></p>`;
    }

    document.execCommand('insertHTML', false, embedHtml);
    setVideoUrlInput('');
    setShowVideoMenu(false);
    handleInput();
  };

  const handleInsertSocialConfirm = () => {
    const rawUrl = socialUrlInput.trim();
    if (!rawUrl) return;
    const net = SOCIAL_NETWORKS.find((s) => s.id === selectedSocialId) || SOCIAL_NETWORKS[0];
    const finalUrl = /^https?:\/\//i.test(rawUrl) ? rawUrl : `https://${rawUrl}`;
    playValidationBeep();
    restoreSelection();
    const socialHtml = `&nbsp;<a href="${finalUrl}" target="_blank" rel="noopener noreferrer" style="display:inline-flex;align-items:center;gap:6px;padding:5px 12px;border-radius:9999px;background:${net.bg};color:#ffffff;font-weight:800;font-size:12px;text-decoration:none;margin:2px 4px;">${net.emoji} ${net.name}</a>&nbsp;`;
    document.execCommand('insertHTML', false, socialHtml);
    setSocialUrlInput('');
    setShowSocialMenu(false);
    handleInput();
  };

  const handleImageFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const base64 = event.target?.result as string;
      if (base64 && editorRef.current) {
        editorRef.current.focus();
        const imgHtml = `<p><img src="${base64}" alt="${file.name}" style="max-width:100%; height:auto; border-radius:14px; margin:8px 0; box-shadow:0 4px 6px -1px rgba(0,0,0,0.1);" /></p><p><br></p>`;
        document.execCommand('insertHTML', false, imgHtml);
        handleInput();
      }
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  // Insérer un modèle de fiche e-commerce complet
  const insertTemplate = () => {
    playValidationBeep();
    if (editorRef.current) {
      editorRef.current.innerHTML = TEMPLATE_EXAMPLE;
      onChange(TEMPLATE_EXAMPLE);
    }
  };

  return (
    <div className="w-full rounded-2xl border border-slate-700/80 bg-slate-900 overflow-hidden shadow-lg transition flex flex-col">
      {/* -------------------------------------------------------------------
          BARRE D'OUTILS STICKY AVEC FOND SOMBRE DÉGRADÉ & ICÔNES MODERNES
         ------------------------------------------------------------------- */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 px-3 py-2 border-b border-slate-700/80 flex flex-wrap items-center justify-between gap-1.5 shrink-0 select-none">
        
        {/* Groupe 1 : Typographie (Gras, Italique, Souligné, Titres H2/H3) */}
        <div className="flex items-center gap-1 bg-slate-950/70 p-1 rounded-xl border border-slate-800">
          <button
            type="button"
            onMouseDown={(e) => { e.preventDefault(); executeCommand('bold'); }}
            className="p-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800 active:scale-95 transition cursor-pointer"
            title="Gras (Ctrl+B)"
          >
            <Bold className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onMouseDown={(e) => { e.preventDefault(); executeCommand('italic'); }}
            className="p-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800 active:scale-95 transition cursor-pointer"
            title="Italique (Ctrl+I)"
          >
            <Italic className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onMouseDown={(e) => { e.preventDefault(); executeCommand('underline'); }}
            className="p-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800 active:scale-95 transition cursor-pointer"
            title="Souligné (Ctrl+U)"
          >
            <Underline className="w-3.5 h-3.5" />
          </button>

          <div className="h-4 w-px bg-slate-800 mx-0.5" />

          <button
            type="button"
            onMouseDown={(e) => { e.preventDefault(); executeCommand('formatBlock', '<h2>'); }}
            className="px-2 py-1 rounded-lg text-[11px] font-black text-indigo-400 hover:bg-slate-800 active:scale-95 transition flex items-center gap-0.5 cursor-pointer"
            title="Titre de section principal H2"
          >
            <Heading2 className="w-3.5 h-3.5" />
            <span className="text-[10px]">H2</span>
          </button>
          <button
            type="button"
            onMouseDown={(e) => { e.preventDefault(); executeCommand('formatBlock', '<h3>'); }}
            className="px-2 py-1 rounded-lg text-[11px] font-black text-amber-400 hover:bg-slate-800 active:scale-95 transition flex items-center gap-0.5 cursor-pointer"
            title="Sous-titre H3"
          >
            <Heading3 className="w-3.5 h-3.5" />
            <span className="text-[10px]">H3</span>
          </button>
        </div>

        {/* Groupe 2 : Listes (Puces & Numérotée) */}
        <div className="flex items-center gap-1 bg-slate-950/70 p-1 rounded-xl border border-slate-800">
          <button
            type="button"
            onMouseDown={(e) => { e.preventDefault(); executeCommand('insertUnorderedList'); }}
            className="p-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800 active:scale-95 transition cursor-pointer"
            title="Liste à puces"
          >
            <List className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onMouseDown={(e) => { e.preventDefault(); executeCommand('insertOrderedList'); }}
            className="p-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800 active:scale-95 transition cursor-pointer"
            title="Liste ordonnée numérotée"
          >
            <ListOrdered className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Groupe 2b : Alignement de texte */}
        <div className="flex items-center gap-1 bg-slate-950/70 p-1 rounded-xl border border-slate-800">
          <button
            type="button"
            onMouseDown={(e) => { e.preventDefault(); executeCommand('justifyLeft'); }}
            className="p-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800 active:scale-95 transition cursor-pointer"
            title="Aligner à gauche"
          >
            <AlignLeft className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onMouseDown={(e) => { e.preventDefault(); executeCommand('justifyCenter'); }}
            className="p-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800 active:scale-95 transition cursor-pointer"
            title="Centrer le texte"
          >
            <AlignCenter className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onMouseDown={(e) => { e.preventDefault(); executeCommand('justifyRight'); }}
            className="p-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800 active:scale-95 transition cursor-pointer"
            title="Aligner à droite"
          >
            <AlignRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Groupe Média & Liens : Lien texte, Image (ImgBB/Postimages), Vidéo, Réseaux sociaux */}
        <div className="flex items-center gap-1 relative">
          {/* 1. Inséreur de Lien sur n'importe quel texte */}
          <div className="relative">
            <button
              type="button"
              onMouseDown={(e) => {
                e.preventDefault();
                saveSelection();
              }}
              onClick={() => {
                playTapBeep();
                const next = !showLinkMenu;
                closeAllMenus();
                setShowLinkMenu(next);
              }}
              className="flex items-center gap-1 px-2 py-1.5 rounded-xl bg-slate-950/80 hover:bg-slate-950 text-sky-400 border border-slate-800 text-xs font-bold transition cursor-pointer shadow-xs active:scale-95"
              title="Transformer le texte sélectionné en lien cliquable"
            >
              <Link2 className="w-3.5 h-3.5" />
              <span className="hidden sm:inline text-[10px]">Lien</span>
            </button>

            {showLinkMenu && (
              <div className="absolute top-full mt-1.5 left-0 z-40 bg-slate-950 border border-slate-700 rounded-2xl p-3 shadow-2xl w-72 space-y-2.5 animate-in fade-in-50 zoom-in-95">
                <div className="text-[11px] font-black text-sky-300 uppercase tracking-wider">
                  🔗 Insérer un lien sur le texte
                </div>
                <input
                  type="text"
                  value={linkTextInput}
                  onChange={(e) => setLinkTextInput(e.target.value)}
                  placeholder="Texte affiché (ou sélectionnez avant)"
                  className="w-full px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-xs text-white focus:border-sky-500 focus:outline-none"
                />
                <input
                  type="url"
                  value={linkUrlInput}
                  onChange={(e) => setLinkUrlInput(e.target.value)}
                  placeholder="https://votre-lien.com"
                  className="w-full px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-xs text-white font-mono focus:border-sky-500 focus:outline-none"
                />
                <button
                  type="button"
                  onClick={handleInsertLinkConfirm}
                  className="w-full py-1.5 rounded-lg bg-sky-600 hover:bg-sky-500 text-white text-xs font-black cursor-pointer"
                >
                  Appliquer le lien
                </button>
              </div>
            )}
          </div>

          {/* 2. Insérer Image (URL + ImgBB & Postimages + Fichier) */}
          <div className="relative">
            <button
              type="button"
              onMouseDown={(e) => {
                e.preventDefault();
                saveSelection();
              }}
              onClick={() => {
                playTapBeep();
                const next = !showImageMenu;
                closeAllMenus();
                setShowImageMenu(next);
              }}
              className="flex items-center gap-1 px-2 py-1.5 rounded-xl bg-slate-950/80 hover:bg-slate-950 text-emerald-400 border border-slate-800 text-xs font-bold transition cursor-pointer shadow-xs active:scale-95"
              title="Insérer une image (ImgBB, Postimages, URL ou fichier)"
            >
              <ImageIcon className="w-3.5 h-3.5" />
              <span className="hidden sm:inline text-[10px]">Image</span>
            </button>

            {showImageMenu && (
              <div className="absolute top-full mt-1.5 left-0 z-40 bg-slate-950 border border-slate-700 rounded-2xl p-3 shadow-2xl w-80 space-y-2.5 animate-in fade-in-50 zoom-in-95">
                <div className="text-[11px] font-black text-emerald-300 uppercase tracking-wider">
                  🖼️ Insérer une image par lien
                </div>
                <p className="text-[10px] text-slate-400 leading-relaxed">
                  Hébergez gratuitement votre image sur <strong>ImgBB</strong> ou <strong>Postimages</strong>, copiez le lien direct et collez-le ici :
                </p>
                <div className="flex items-center gap-2">
                  <a
                    href="https://imgbb.com"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 py-1 px-2 rounded-lg bg-slate-900 border border-slate-700 hover:border-emerald-500 text-[10px] font-bold text-emerald-300 flex items-center justify-center gap-1"
                  >
                    <ExternalLink className="w-3 h-3" /> ImgBB
                  </a>
                  <a
                    href="https://postimages.org"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 py-1 px-2 rounded-lg bg-slate-900 border border-slate-700 hover:border-sky-500 text-[10px] font-bold text-sky-300 flex items-center justify-center gap-1"
                  >
                    <ExternalLink className="w-3 h-3" /> Postimages
                  </a>
                </div>
                <input
                  type="url"
                  value={imageUrlInput}
                  onChange={(e) => setImageUrlInput(e.target.value)}
                  placeholder="https://i.ibb.co/... ou https://i.postimg.cc/..."
                  className="w-full px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-xs text-white font-mono focus:border-emerald-500 focus:outline-none"
                />
                <div className="flex gap-1.5">
                  <button
                    type="button"
                    onClick={handleInsertImageUrlConfirm}
                    className="flex-1 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-black cursor-pointer"
                  >
                    Insérer le lien
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowImageMenu(false);
                      fileInputRef.current?.click();
                    }}
                    className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold cursor-pointer"
                  >
                    Fichier
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* 3. Insérer Vidéo (YouTube, Vimeo, TikTok, MP4) */}
          <div className="relative">
            <button
              type="button"
              onMouseDown={(e) => {
                e.preventDefault();
                saveSelection();
              }}
              onClick={() => {
                playTapBeep();
                const next = !showVideoMenu;
                closeAllMenus();
                setShowVideoMenu(next);
              }}
              className="flex items-center gap-1 px-2 py-1.5 rounded-xl bg-slate-950/80 hover:bg-slate-950 text-rose-400 border border-slate-800 text-xs font-bold transition cursor-pointer shadow-xs active:scale-95"
              title="Coller le lien d'une vidéo dans la description"
            >
              <Video className="w-3.5 h-3.5" />
              <span className="hidden sm:inline text-[10px]">Vidéo</span>
            </button>

            {showVideoMenu && (
              <div className="absolute top-full mt-1.5 left-0 z-40 bg-slate-950 border border-slate-700 rounded-2xl p-3 shadow-2xl w-72 space-y-2.5 animate-in fade-in-50 zoom-in-95">
                <div className="text-[11px] font-black text-rose-300 uppercase tracking-wider">
                  🎬 Coller le lien d'une vidéo
                </div>
                <p className="text-[10px] text-slate-400">
                  Compatible YouTube, Vimeo ou lien direct `.mp4` / `.webm`.
                </p>
                <input
                  type="url"
                  value={videoUrlInput}
                  onChange={(e) => setVideoUrlInput(e.target.value)}
                  placeholder="https://youtube.com/watch?v=... ou .mp4"
                  className="w-full px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-xs text-white font-mono focus:border-rose-500 focus:outline-none"
                />
                <button
                  type="button"
                  onClick={handleInsertVideoConfirm}
                  className="w-full py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-xs font-black cursor-pointer"
                >
                  Intégrer la vidéo
                </button>
              </div>
            )}
          </div>

          {/* 4. Insérer Logo Réseau Social + Lien */}
          <div className="relative">
            <button
              type="button"
              onMouseDown={(e) => {
                e.preventDefault();
                saveSelection();
              }}
              onClick={() => {
                playTapBeep();
                const next = !showSocialMenu;
                closeAllMenus();
                setShowSocialMenu(next);
              }}
              className="flex items-center gap-1 px-2 py-1.5 rounded-xl bg-slate-950/80 hover:bg-slate-950 text-amber-400 border border-slate-800 text-xs font-bold transition cursor-pointer shadow-xs active:scale-95"
              title="Insérer un logo de réseau social avec lien"
            >
              <Share2 className="w-3.5 h-3.5" />
              <span className="hidden sm:inline text-[10px]">Réseaux</span>
            </button>

            {showSocialMenu && (
              <div className="absolute top-full mt-1.5 right-0 z-40 bg-slate-950 border border-slate-700 rounded-2xl p-3 shadow-2xl w-72 space-y-2.5 animate-in fade-in-50 zoom-in-95">
                <div className="text-[11px] font-black text-amber-300 uppercase tracking-wider">
                  📱 Logo Réseau Social + Lien
                </div>
                <div className="grid grid-cols-4 gap-1.5">
                  {SOCIAL_NETWORKS.map((net) => (
                    <button
                      key={net.id}
                      type="button"
                      onClick={() => setSelectedSocialId(net.id)}
                      className={`p-1.5 rounded-lg border text-center text-[10px] font-bold cursor-pointer transition ${
                        selectedSocialId === net.id
                          ? 'border-amber-400 bg-slate-800 text-white'
                          : 'border-slate-800 bg-slate-900 text-slate-400 hover:text-white'
                      }`}
                      title={net.name}
                    >
                      <div className="text-sm">{net.emoji}</div>
                      <div className="truncate">{net.name.split(' ')[0]}</div>
                    </button>
                  ))}
                </div>
                <input
                  type="url"
                  value={socialUrlInput}
                  onChange={(e) => setSocialUrlInput(e.target.value)}
                  placeholder={SOCIAL_NETWORKS.find((s) => s.id === selectedSocialId)?.placeholder || 'https://...'}
                  className="w-full px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-xs text-white font-mono focus:border-amber-500 focus:outline-none"
                />
                <button
                  type="button"
                  onClick={handleInsertSocialConfirm}
                  className="w-full py-1.5 rounded-lg bg-amber-600 hover:bg-amber-500 text-white text-xs font-black cursor-pointer"
                >
                  Insérer le bouton social
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Groupe 3 : Couleurs e-commerce, Surlignage et Badges */}
        <div className="flex items-center gap-1.5 relative">
          
          {/* Sélecteur de Couleurs Textes */}
          <div className="relative">
            <button
              type="button"
              onClick={() => {
                setShowColorPalette(!showColorPalette);
                setShowHighlightPalette(false);
                setShowBadgesMenu(false);
              }}
              className="flex items-center gap-1 px-2 py-1.5 rounded-xl bg-slate-950/80 hover:bg-slate-950 text-slate-300 border border-slate-800 text-xs font-bold transition cursor-pointer"
              title="Couleur de texte"
            >
              <Palette className="w-3.5 h-3.5 text-emerald-400" />
              <span className="w-2.5 h-2.5 rounded-full inline-block border border-white/20" style={{ backgroundColor: selectedColor }} />
            </button>

            {/* Menu Popover Couleurs */}
            {showColorPalette && (
              <div className="absolute top-full mt-1.5 left-0 z-30 bg-slate-950 border border-slate-700 rounded-2xl p-2.5 shadow-2xl w-48 space-y-2 animate-in fade-in-50 zoom-in-95">
                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-1">
                  Couleurs E-commerce
                </div>
                <div className="grid grid-cols-4 gap-1.5">
                  {ECOMMERCE_COLORS.map(c => (
                    <button
                      key={c.hex}
                      type="button"
                      onMouseDown={(e) => {
                        e.preventDefault();
                        applyTextColor(c.hex);
                      }}
                      className="w-8 h-8 rounded-xl flex items-center justify-center transition hover:scale-110 active:scale-95 cursor-pointer relative"
                      style={{ backgroundColor: c.hex }}
                      title={c.name}
                    >
                      {selectedColor === c.hex && <Check className="w-4 h-4 text-slate-950 font-black" />}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Surlignage (Highlight) */}
          <div className="relative">
            <button
              type="button"
              onClick={() => {
                setShowHighlightPalette(!showHighlightPalette);
                setShowColorPalette(false);
                setShowBadgesMenu(false);
              }}
              className="flex items-center gap-1 px-2 py-1.5 rounded-xl bg-slate-950/80 hover:bg-slate-950 text-slate-300 border border-slate-800 text-xs font-bold transition cursor-pointer"
              title="Surligner le texte (arguments de vente)"
            >
              <Highlighter className="w-3.5 h-3.5 text-amber-400" />
            </button>

            {/* Menu Popover Surlignage */}
            {showHighlightPalette && (
              <div className="absolute top-full mt-1.5 left-0 z-30 bg-slate-950 border border-slate-700 rounded-2xl p-2.5 shadow-2xl w-44 space-y-1.5 animate-in fade-in-50 zoom-in-95">
                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-1">
                  Surlignage Clé
                </div>
                {HIGHLIGHT_COLORS.map(hl => (
                  <button
                    key={hl.name}
                    type="button"
                    onMouseDown={(e) => {
                      e.preventDefault();
                      applyHighlight(hl);
                    }}
                    className="w-full text-left px-2 py-1.5 rounded-lg text-xs font-bold flex items-center justify-between transition hover:opacity-90 cursor-pointer"
                    style={{ backgroundColor: hl.bg, color: hl.text, border: `1px solid ${hl.border}` }}
                  >
                    <span>{hl.name}</span>
                    <Sparkles className="w-3 h-3" />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Badges Rapides */}
          <div className="relative">
            <button
              type="button"
              onClick={() => {
                setShowBadgesMenu(!showBadgesMenu);
                setShowColorPalette(false);
                setShowHighlightPalette(false);
              }}
              className="flex items-center gap-1 px-2 py-1.5 rounded-xl bg-slate-950/80 hover:bg-slate-950 text-indigo-300 border border-slate-800 text-xs font-bold transition cursor-pointer"
              title="Insérer un badge stylisé"
            >
              <Tag className="w-3.5 h-3.5 text-indigo-400" />
              <span className="hidden sm:inline text-[10px]">Badges</span>
            </button>

            {/* Menu Popover Badges */}
            {showBadgesMenu && (
              <div className="absolute top-full mt-1.5 right-0 sm:left-0 z-30 bg-slate-950 border border-slate-700 rounded-2xl p-2.5 shadow-2xl w-52 space-y-1.5 animate-in fade-in-50 zoom-in-95">
                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-1">
                  Badges Stylisés
                </div>
                {PRESET_BADGES.map(b => (
                  <button
                    key={b.label}
                    type="button"
                    onMouseDown={(e) => {
                      e.preventDefault();
                      insertBadge(b);
                    }}
                    className="w-full text-left px-2.5 py-1.5 rounded-xl text-[11px] font-black flex items-center justify-between transition hover:scale-102 cursor-pointer"
                    style={{ color: b.color, backgroundColor: b.bg, border: `1px solid ${b.border}` }}
                  >
                    <span>{b.label}</span>
                    <Check className="w-3 h-3 opacity-60" />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Modèle de Description Complète */}
          <button
            type="button"
            onClick={insertTemplate}
            className="flex items-center gap-1 px-2 py-1.5 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/30 text-xs font-bold transition cursor-pointer"
            title="Insérer une structure e-commerce complète prête à l'emploi"
          >
            <Wand2 className="w-3.5 h-3.5 text-amber-400" />
            <span className="hidden sm:inline text-[10px]">Modèle Pro</span>
          </button>
        </div>

        {/* Groupe 4 : Bascule Édition / Aperçu en Direct */}
        <div className="flex items-center bg-slate-950/80 p-0.5 rounded-xl border border-slate-800 ml-auto">
          <button
            type="button"
            onClick={() => setActiveTab('edit')}
            className={`px-2.5 py-1 rounded-lg text-[10.5px] font-bold flex items-center gap-1 transition cursor-pointer ${
              activeTab === 'edit'
                ? 'bg-slate-800 text-white shadow-xs'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Edit3 className="w-3 h-3" />
            <span>Éditer</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('preview')}
            className={`px-2.5 py-1 rounded-lg text-[10.5px] font-bold flex items-center gap-1 transition cursor-pointer ${
              activeTab === 'preview'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Eye className="w-3 h-3" />
            <span>Aperçu</span>
          </button>
        </div>
      </div>

      {/* -------------------------------------------------------------------
          ZONE D'ÉDITION & APERÇU EN DIRECT SYNCHRONISÉ
         ------------------------------------------------------------------- */}
      <div className="relative p-3.5 bg-slate-950/90 text-slate-200 text-xs min-h-[160px] flex-1">
        {activeTab === 'edit' ? (
          <div
            ref={editorRef}
            contentEditable
            onInput={handleInput}
            onBlur={handleInput}
            style={{ minHeight }}
            className="w-full h-full focus:outline-none leading-relaxed text-slate-200 text-xs space-y-1.5 selection:bg-indigo-500/30 [&_h2]:text-sm [&_h2]:font-black [&_h2]:text-indigo-400 [&_h2]:mt-2.5 [&_h2]:mb-1 [&_h3]:text-xs [&_h3]:font-black [&_h3]:text-amber-400 [&_h3]:mt-2 [&_h3]:mb-0.5 [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:space-y-1 [&_ol]:list-decimal [&_ol]:pl-5 [&_ol]:space-y-1 [&_li]:text-slate-300 [&_p]:mb-1"
            data-placeholder={placeholder}
          />
        ) : (
          <div style={{ minHeight }} className="space-y-2">
            <div className="flex items-center justify-between border-b border-slate-800 pb-1.5 mb-2">
              <span className="text-[10px] font-black uppercase tracking-wider text-emerald-400 flex items-center gap-1">
                <Check className="w-3 h-3" />
                Rendu exact sur la fiche client
              </span>
              <span className="text-[9.5px] text-slate-500 font-mono">HTML Sauvegardé</span>
            </div>
            {value ? (
              <ProductRichDescription content={value} />
            ) : (
              <p className="text-slate-500 italic text-xs">
                Aucun contenu saisi. Rédigez votre description ou cliquez sur "Modèle Pro".
              </p>
            )}
          </div>
        )}
      </div>

      {/* Pied d'éditeur informatif */}
      <div className="px-3 py-1.5 bg-slate-950 border-t border-slate-800/80 flex items-center justify-between text-[10px] text-slate-500 shrink-0">
        <span>💡 Mettez en avant les points forts, bienfaits et garanties pour maximiser vos commandes WhatsApp.</span>
        <span className="font-mono">{value ? `${value.length} caractères` : '0 car.'}</span>
      </div>

      {/* Input fichier caché pour l'insertion d'images dans l'éditeur */}
      <input 
        type="file" 
        ref={fileInputRef} 
        accept="image/*" 
        className="hidden" 
        onChange={handleImageFileChange} 
      />
    </div>
  );
};

// =========================================================================
// COMPOSANT D'AFFICHAGE DU TEXTE ENRICHI CÔTÉ CLIENT (Fiche Produit)
// =========================================================================
interface ProductRichDescriptionProps {
  content?: string;
  storeName?: string;
  className?: string;
  theme?: 'light' | 'dark' | 'blue';
}

export const ProductRichDescription: React.FC<ProductRichDescriptionProps> = ({
  content,
  storeName = "notre boutique",
  className = "",
  theme = 'dark'
}) => {
  if (!content || !content.trim()) {
    return (
      <p className={`leading-relaxed text-xs text-muted ${className}`}>
        Produit de qualité supérieure sélectionné par {storeName}. Idéal pour votre consommation quotidienne, emballé soigneusement et prêt à être livré en express.
      </p>
    );
  }

  // Si le contenu contient des balises HTML (<p>, <h2>, <span>, <ul>, etc.)
  const isHtml = /<[a-z][\s\S]*>/i.test(content);

  if (isHtml) {
    return (
      <div 
        className={`rich-description-render text-xs leading-relaxed space-y-1.5 text-body [&_li]:text-body [&_strong]:text-body [&_strong]:font-black [&_b]:text-body [&_b]:font-black [&_h2]:text-sm [&_h2]:font-black [&_h2]:text-indigo-500 [&_h2]:mt-3 [&_h2]:mb-1 [&_h3]:text-xs [&_h3]:font-black [&_h3]:text-amber-500 [&_h3]:mt-2 [&_h3]:mb-0.5 [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:space-y-1 [&_ol]:list-decimal [&_ol]:pl-5 [&_ol]:space-y-1 [&_p]:mb-1.5 [&_img]:max-w-full [&_img]:rounded-xl [&_img]:my-2 ${className}`}
        dangerouslySetInnerHTML={{ __html: sanitizeRichHtml(content) }}
      />
    );
  }

  // Sinon affichage texte avec conservation des retours à la ligne
  return (
    <p className={`leading-relaxed text-xs whitespace-pre-line text-body ${className}`}>
      {content}
    </p>
  );
};
export default RichTextEditor;
