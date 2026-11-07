'use client';

import React, { useState } from 'react';
import { 
  Type, 
  Image as ImageIcon, 
  Sparkles, 
  Layout, 
  Smartphone, 
  Monitor, 
  Code, 
  Copy, 
  Check, 
  Plus, 
  Trash2, 
  HelpCircle,
  Bold,
  Italic,
  Link,
  Smile,
  AlignCenter,
  AlignLeft,
  AlignRight,
  Palette,
  FileText,
  ArrowUp,
  ArrowDown,
  Eye,
  Sliders,
  Tag,
  Star,
  ShieldCheck,
  Send,
  Zap,
  ExternalLink,
  Info,
  Heading1,
  Heading2,
  Heading3,
  Inbox,
  X,
  Mail,
  Archive,
  Star as StarIcon,
  Reply,
  MoreVertical,
  Maximize2,
  CheckCircle2,
  Paintbrush,
  Layers,
  Flame,
  Crown,
  RefreshCw,
  AlertCircle
} from 'lucide-react';

export interface EmailBlock {
  id: string;
  type: 'logo' | 'banner' | 'heading' | 'text' | 'button' | 'image' | 'footer' | 'divider' | 'badge' | 'testimonial';
  content: string;
  url?: string; // Lien global du bloc (redirection complète)
  headingLevel?: 'h1' | 'h2' | 'h3';
  logoWidth?: number;
  bannerConfig?: {
    subtitle?: string;
    gradientPreset?: 'royal' | 'luxury' | 'sunset' | 'emerald' | 'cyber' | 'pastel' | 'image';
    imageUrl?: string;
    height?: 'compact' | 'standard' | 'large';
    borderRadius?: 'rounded' | 'sharp';
    badgeText?: string;
  };
  styles?: {
    align?: 'left' | 'center' | 'right';
    textColor?: string;
    backgroundColor?: string;
    fontSize?: 'sm' | 'md' | 'lg' | 'xl' | '2xl';
    isBold?: boolean;
    isItalic?: boolean;
    isUnderline?: boolean;
  };
}

export interface EmailBuilderStudioProps {
  onTemplateSave: (htmlContent: string, subject: string, senderName?: string, senderEmail?: string) => void;
  initialSubject?: string;
  initialSenderName?: string;
  initialSenderEmail?: string;
}

// Bannières vectorielles ultra-légères (0 Ko) & optimisées
export const BANNER_PRESETS: Record<string, { 
  name: string; 
  gradient: string; 
  textColor: string; 
  subtextColor: string; 
  badgeBg: string; 
  weightLabel: string;
  isImage?: boolean;
}> = {
  royal: {
    name: 'Bleu Royal Nanasore',
    gradient: 'linear-gradient(135deg, #1D4ED8 0%, #2563EB 50%, #3B82F6 100%)',
    textColor: '#ffffff',
    subtextColor: '#DBEAFE',
    badgeBg: 'rgba(255,255,255,0.22)',
    weightLabel: '⚡ 0 Ko (Poids Plume)'
  },
  luxury: {
    name: 'Prestige & Or Sombre',
    gradient: 'linear-gradient(135deg, #0F172A 0%, #1E293B 60%, #B45309 100%)',
    textColor: '#ffffff',
    subtextColor: '#FDE68A',
    badgeBg: 'rgba(217,119,6,0.3)',
    weightLabel: '⚡ 0 Ko (Poids Plume)'
  },
  sunset: {
    name: 'Vente Flash Sunset',
    gradient: 'linear-gradient(135deg, #DC2626 0%, #EA580C 50%, #F59E0B 100%)',
    textColor: '#ffffff',
    subtextColor: '#FEF3C7',
    badgeBg: 'rgba(255,255,255,0.25)',
    weightLabel: '⚡ 0 Ko (Poids Plume)'
  },
  emerald: {
    name: 'Émeraude & Nature',
    gradient: 'linear-gradient(135deg, #064E3B 0%, #059669 60%, #10B981 100%)',
    textColor: '#ffffff',
    subtextColor: '#D1FAE5',
    badgeBg: 'rgba(255,255,255,0.22)',
    weightLabel: '⚡ 0 Ko (Poids Plume)'
  },
  cyber: {
    name: 'Indigo & Cyber Tech',
    gradient: 'linear-gradient(135deg, #312E81 0%, #4F46E5 50%, #7C3AED 100%)',
    textColor: '#ffffff',
    subtextColor: '#E0E7FF',
    badgeBg: 'rgba(255,255,255,0.25)',
    weightLabel: '⚡ 0 Ko (Poids Plume)'
  },
  pastel: {
    name: 'Crème & Ambre Doux',
    gradient: 'linear-gradient(135deg, #FEF3C7 0%, #FDE68A 50%, #FBBF24 100%)',
    textColor: '#78350F',
    subtextColor: '#92400E',
    badgeBg: 'rgba(120,53,15,0.15)',
    weightLabel: '⚡ 0 Ko (Poids Plume)'
  },
  image: {
    name: 'Image WebP Compressée (<30 Ko)',
    gradient: 'linear-gradient(rgba(15, 23, 42, 0.72), rgba(15, 23, 42, 0.72))',
    textColor: '#ffffff',
    subtextColor: '#E2E8F0',
    badgeBg: 'rgba(255,255,255,0.25)',
    weightLabel: '🖼️ WebP Optimisé (< 30 Ko)',
    isImage: true
  }
};

// =============================================================================
// FONCTIONS UTILITAIRES : LIENS HYPERTEXTES INLINE DANS UN MORCEAU DE TEXTE
// =============================================================================

/**
 * Convertit un texte brut contenant des liens markdown [texte](url) ou des balises <a>
 * en balises HTML <a> stylisées pour tous les clients mails (Brevo, Gmail, Outlook, Apple Mail).
 */
export const formatInlineLinks = (rawText: string, linkColor: string = '#2563EB'): string => {
  if (!rawText) return '';
  
  // 1. Remplacement des liens markdown [morceau](url)
  let formatted = rawText.replace(
    /\[([^\]]+)\]\((https?:\/\/[^\s\)]+|mailto:[^\s\)]+|tel:[^\s\)]+|wa\.me[^\s\)]+)\)/gi,
    (match, label, url) => {
      const cleanUrl = url.startsWith('http') || url.startsWith('mailto:') || url.startsWith('tel:') 
        ? url 
        : `https://${url}`;
      return `<a href="${cleanUrl}" target="_blank" rel="noopener noreferrer" style="color: ${linkColor}; font-weight: 600; text-decoration: underline; text-underline-offset: 2px;">${label}</a>`;
    }
  );

  // 2. Harmonisation des balises HTML <a> déjà présentes
  formatted = formatted.replace(
    /<a\s+(?:[^>]*?\s+)?href=(["'])(.*?)\1([^>]*)>(.*?)<\/a>/gi,
    (match, quote, url, rest, label) => {
      return `<a href="${url}" target="_blank" rel="noopener noreferrer" style="color: ${linkColor}; font-weight: 600; text-decoration: underline; text-underline-offset: 2px;">${label}</a>`;
    }
  );

  // 3. Support du gras markdown **texte**
  formatted = formatted.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');

  // 4. Support de l'italique markdown *texte*
  formatted = formatted.replace(/(?<!\*)\*([^*]+)\*(?!\*)/g, '<em>$1</em>');

  return formatted;
};

/**
 * Extrait la liste de tous les liens inline présents dans un texte pour le panneau de gestion.
 */
export const extractInlineLinks = (rawText: string): Array<{ label: string; url: string; fullMatch: string }> => {
  if (!rawText) return [];
  const links: Array<{ label: string; url: string; fullMatch: string }> = [];

  // Liens markdown [texte](url)
  const mdRegex = /\[([^\]]+)\]\((https?:\/\/[^\s\)]+|mailto:[^\s\)]+|tel:[^\s\)]+|wa\.me[^\s\)]+)\)/gi;
  let match;
  while ((match = mdRegex.exec(rawText)) !== null) {
    links.push({ label: match[1], url: match[2], fullMatch: match[0] });
  }

  // Liens HTML <a href="...">texte</a>
  const htmlRegex = /<a\s+(?:[^>]*?\s+)?href=(["'])(.*?)\1[^>]*>(.*?)<\/a>/gi;
  while ((match = htmlRegex.exec(rawText)) !== null) {
    links.push({ label: match[3], url: match[2], fullMatch: match[0] });
  }

  return links;
};

export function EmailBuilderStudio({
  onTemplateSave,
  initialSubject = '🔥 Offre exclusive de la semaine !',
  initialSenderName = 'Ma Boutique Pro',
  initialSenderEmail = 'contact@maboutique.com'
}: EmailBuilderStudioProps) {
  const [subject, setSubject] = useState<string>(initialSubject);
  const [senderName, setSenderName] = useState<string>(initialSenderName);
  const [senderEmail, setSenderEmail] = useState<string>(initialSenderEmail);
  const [previewMode, setPreviewMode] = useState<'desktop' | 'mobile'>('desktop');
  const [activeTab, setActiveTab] = useState<'visual' | 'code'>('visual');
  const [copiedVar, setCopiedVar] = useState<string | null>(null);
  const [selectedBlockId, setSelectedBlockId] = useState<string | null>('4');
  const [copiedHtml, setCopiedHtml] = useState(false);
  const [isInboxModalOpen, setIsInboxModalOpen] = useState(false);

  // Couleurs d'arrière-plan configurables
  const [emailBgColor, setEmailBgColor] = useState<string>('#FBF9F5');
  const [cardBgColor, setCardBgColor] = useState<string>('#FFFFFF');

  // État de sélection d'un morceau de texte pour transformation en lien
  const [textSelection, setTextSelection] = useState<{
    blockId: string;
    start: number;
    end: number;
    selectedText: string;
  } | null>(null);

  // Modale d'insertion de lien dans un morceau de texte
  const [inlineLinkModal, setInlineLinkModal] = useState<{
    isOpen: boolean;
    blockId: string;
    selectedText: string;
    url: string;
    start?: number;
    end?: number;
  } | null>(null);

  // État d'envoi d'e-mail de test via l'API Brevo
  const [isSendingTest, setIsSendingTest] = useState(false);
  const [testFeedback, setTestFeedback] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);

  // Palette de couleurs de texte pour entreprise
  const colorPresets = [
    { label: 'Bleu Royal Nanasore', value: '#2563EB' },
    { label: 'Bleu Sombre', value: '#1D4ED8' },
    { label: 'Noir & Ardoise', value: '#0F172A' },
    { label: 'Gris Neutre', value: '#475569' },
    { label: 'Émeraude Succès', value: '#10B981' },
    { label: 'Ambre Promotion', value: '#F59E0B' },
    { label: 'Rouge Flash', value: '#EF4444' }
  ];

  // Blocs dynamiques enrichis avec Logo, Bannière Stylisée 0 Ko, H1/H2/H3, Liens Inline
  const [blocks, setBlocks] = useState<EmailBlock[]>([
    {
      id: '1',
      type: 'logo',
      content: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=300&auto=format&fit=crop',
      url: 'https://nanasore.com',
      logoWidth: 150,
      styles: { align: 'center' }
    },
    {
      id: 'banner-hero',
      type: 'banner',
      content: '🎉 GRANDES VENTES PRIVÉES • JUSQU\'À -50%',
      url: 'https://nanasore.com',
      bannerConfig: {
        subtitle: 'Valable ce week-end uniquement sur l\'ensemble du catalogue boutique',
        gradientPreset: 'royal',
        badgeText: '⚡ OFFRE FLASH',
        height: 'standard',
        borderRadius: 'rounded'
      },
      styles: { align: 'center', textColor: '#ffffff' }
    },
    { 
      id: '2', 
      type: 'badge', 
      content: '⚡ ÉDITION LIMITÉE • ACCÈS PRIORITAIRE CLIENTS', 
      styles: { align: 'center', textColor: '#2563EB', backgroundColor: '#EFF6FF' } 
    },
    { 
      id: '3', 
      type: 'heading', 
      headingLevel: 'h1',
      content: '🔥 Offre exclusive réservée à nos meilleurs clients !', 
      url: 'https://nanasore.com',
      styles: { align: 'center', textColor: '#2563EB', fontSize: '2xl', isBold: true } 
    },
    { 
      id: '4', 
      type: 'text', 
      content: 'Bonjour {{FIRSTNAME}}, nous sommes ravis de vous compter parmi les clients privilégiés de {{SHOP_NAME}}. Pour célébrer notre nouvelle collection, profitez dès maintenant de nos [tarifs exclusifs](https://nanasore.com/collection) avec le code promo {{PROMO_CODE}}.', 
      styles: { align: 'left', textColor: '#334155', fontSize: 'md' } 
    },
    { 
      id: '5', 
      type: 'image', 
      content: 'https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?q=80&w=800&auto=format&fit=crop', 
      url: 'https://nanasore.com',
      styles: { align: 'center' } 
    },
    { 
      id: '6', 
      type: 'button', 
      content: 'Découvrir la Collection en 1-Clic', 
      url: 'https://nanasore.com', 
      styles: { align: 'center', backgroundColor: '#2563EB', textColor: '#ffffff' } 
    },
    { 
      id: '7', 
      type: 'footer', 
      content: 'Vous recevez cet e-mail suite à votre inscription sur {{SHOP_NAME}}. Conformité RGPD & directives anti-spam. [Cliquez ici pour vous désabonner](https://nanasore.com/unsubscribe).' 
    }
  ]);

  const addBlock = (type: EmailBlock['type']) => {
    let defaultContent = 'Nouveau texte informatif...';
    let defaultStyles: EmailBlock['styles'] = { align: 'center', textColor: '#1e293b' };
    let defaultUrl: string | undefined = undefined;
    let headingLevel: EmailBlock['headingLevel'] = undefined;
    let logoWidth: number | undefined = undefined;
    let bannerConfig: EmailBlock['bannerConfig'] = undefined;

    if (type === 'banner') {
      defaultContent = '🔥 OFFRE SPÉCIALE • JUSQU\'À -40%';
      defaultUrl = 'https://nanasore.com';
      defaultStyles = { align: 'center', textColor: '#ffffff' };
      bannerConfig = {
        subtitle: 'Profitez de tarifs préférentiels pendant 48 heures seulement',
        gradientPreset: 'royal',
        badgeText: '⚡ VENTES FLASH',
        height: 'standard',
        borderRadius: 'rounded'
      };
    } else if (type === 'logo') {
      defaultContent = 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=300&auto=format&fit=crop';
      defaultUrl = 'https://nanasore.com';
      logoWidth = 140;
      defaultStyles = { align: 'center' };
    } else if (type === 'heading') {
      defaultContent = 'Nouveau grand titre accrocheur 🚀';
      headingLevel = 'h2';
      defaultStyles = { align: 'center', textColor: '#2563EB', fontSize: 'xl', isBold: true };
    } else if (type === 'badge') {
      defaultContent = '🔥 NOUVELLE COLLECTION DISPONIBLE';
      defaultStyles = { align: 'center', textColor: '#2563EB', backgroundColor: '#EFF6FF' };
    } else if (type === 'image') {
      defaultContent = 'https://images.unsplash.com/photo-1557804506-669a67965ba0?q=80&w=800&auto=format&fit=crop';
      defaultUrl = 'https://nanasore.com';
    } else if (type === 'button') {
      defaultContent = 'Profiter de l\'offre maintenant';
      defaultUrl = 'https://nanasore.com';
      defaultStyles = { align: 'center', backgroundColor: '#2563EB', textColor: '#ffffff' };
    } else if (type === 'testimonial') {
      defaultContent = '« Une expérience client exceptionnelle avec un suivi WhatsApp irréprochable ! »';
      defaultStyles = { align: 'center', textColor: '#475569', backgroundColor: '#F8FAFC' };
    } else if (type === 'footer') {
      defaultContent = '© 2026 {{SHOP_NAME}}. Tous droits réservés. [Se désabonner](https://nanasore.com/unsubscribe).';
      defaultStyles = { align: 'center', textColor: '#64748b', fontSize: 'sm' };
    }

    const newId = Date.now().toString();
    const newBlock: EmailBlock = {
      id: newId,
      type,
      content: defaultContent,
      styles: defaultStyles,
      url: defaultUrl,
      headingLevel,
      logoWidth,
      bannerConfig
    };

    setBlocks(prev => [...prev, newBlock]);
    setSelectedBlockId(newId);
  };

  const removeBlock = (id: string) => {
    setBlocks(prev => prev.filter(b => b.id !== id));
    if (selectedBlockId === id) setSelectedBlockId(null);
  };

  const moveBlock = (id: string, direction: 'up' | 'down') => {
    const index = blocks.findIndex(b => b.id === id);
    if (index === -1) return;
    if (direction === 'up' && index === 0) return;
    if (direction === 'down' && index === blocks.length - 1) return;

    const newBlocks = [...blocks];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    const temp = newBlocks[index];
    newBlocks[index] = newBlocks[targetIndex];
    newBlocks[targetIndex] = temp;
    setBlocks(newBlocks);
  };

  // Positionnement rapide de la bannière : En haut ou juste sous le logo
  const placeBannerPosition = (id: string, underLogo: boolean) => {
    const blockIndex = blocks.findIndex(b => b.id === id);
    if (blockIndex === -1) return;
    const target = blocks[blockIndex];
    const remaining = blocks.filter(b => b.id !== id);

    if (!underLogo) {
      // Tout en haut (position 0)
      setBlocks([target, ...remaining]);
    } else {
      // Juste après le logo si existant
      const logoIdx = remaining.findIndex(b => b.type === 'logo');
      if (logoIdx !== -1) {
        const next = [...remaining];
        next.splice(logoIdx + 1, 0, target);
        setBlocks(next);
      } else {
        setBlocks([target, ...remaining]);
      }
    }
  };

  const updateBlockContent = (id: string, content: string) => {
    setBlocks(prev => prev.map(b => b.id === id ? { ...b, content } : b));
  };

  const updateBlockUrl = (id: string, url: string) => {
    setBlocks(prev => prev.map(b => b.id === id ? { ...b, url } : b));
  };

  const updateBannerConfig = (id: string, configUpdates: Partial<NonNullable<EmailBlock['bannerConfig']>>) => {
    setBlocks(prev => prev.map(b => b.id === id ? {
      ...b,
      bannerConfig: { ...b.bannerConfig, ...configUpdates }
    } : b));
  };

  const updateBlockStyles = (id: string, styleUpdates: Partial<NonNullable<EmailBlock['styles']>>) => {
    setBlocks(prev => prev.map(b => b.id === id ? {
      ...b,
      styles: { ...b.styles, ...styleUpdates }
    } : b));
  };

  const updateHeadingLevel = (id: string, level: 'h1' | 'h2' | 'h3') => {
    const fontSize = level === 'h1' ? '2xl' : level === 'h2' ? 'xl' : 'lg';
    setBlocks(prev => prev.map(b => b.id === id ? {
      ...b,
      headingLevel: level,
      styles: { ...b.styles, fontSize }
    } : b));
  };

  const updateLogoWidth = (id: string, width: number) => {
    setBlocks(prev => prev.map(b => b.id === id ? { ...b, logoWidth: width } : b));
  };

  // ===========================================================================
  // GESTION DE LA SÉLECTION DE TEXTE & INSERTION DE LIEN DANS UN MORCEAU
  // ===========================================================================

  const handleTextSelect = (blockId: string, e: React.SyntheticEvent<HTMLTextAreaElement | HTMLInputElement>) => {
    const target = e.currentTarget;
    const start = target.selectionStart ?? 0;
    const end = target.selectionEnd ?? 0;
    if (start !== end) {
      const selectedText = target.value.substring(start, end);
      setTextSelection({ blockId, start, end, selectedText });
    }
  };

  const openInlineLinkModal = (blockId: string) => {
    const block = blocks.find(b => b.id === blockId);
    if (!block) return;

    if (textSelection && textSelection.blockId === blockId && textSelection.selectedText.trim()) {
      setInlineLinkModal({
        isOpen: true,
        blockId,
        selectedText: textSelection.selectedText.trim(),
        url: '',
        start: textSelection.start,
        end: textSelection.end
      });
    } else {
      setInlineLinkModal({
        isOpen: true,
        blockId,
        selectedText: '',
        url: '',
      });
    }
  };

  const applyInlineLink = (blockId: string, textToLink: string, url: string, start?: number, end?: number) => {
    if (!textToLink.trim() || !url.trim()) return;
    const cleanUrl = url.trim().startsWith('http') || url.trim().startsWith('mailto:') || url.trim().startsWith('tel:') 
      ? url.trim() 
      : `https://${url.trim()}`;

    setBlocks(prev => prev.map(b => {
      if (b.id !== blockId) return b;
      
      // Si une sélection de position est disponible
      if (typeof start === 'number' && typeof end === 'number' && start !== end) {
        const before = b.content.substring(0, start);
        const after = b.content.substring(end);
        const newContent = `${before}[${textToLink.trim()}](${cleanUrl})${after}`;
        return { ...b, content: newContent };
      }

      // Si le texte est présent dans le bloc
      if (b.content.includes(textToLink.trim())) {
        const newContent = b.content.replace(textToLink.trim(), `[${textToLink.trim()}](${cleanUrl})`);
        return { ...b, content: newContent };
      }

      // Sinon, on l'ajoute au contenu
      return { ...b, content: `${b.content} [${textToLink.trim()}](${cleanUrl})` };
    }));

    setInlineLinkModal(null);
    setTextSelection(null);
  };

  const removeInlineLink = (blockId: string, fullMatch: string, label: string) => {
    setBlocks(prev => prev.map(b => {
      if (b.id !== blockId) return b;
      return { ...b, content: b.content.replace(fullMatch, label) };
    }));
  };

  const wrapSelectionWith = (blockId: string, wrapper: '**' | '*') => {
    if (!textSelection || textSelection.blockId !== blockId) return;
    const { start, end, selectedText } = textSelection;
    if (!selectedText) return;

    setBlocks(prev => prev.map(b => {
      if (b.id !== blockId) return b;
      const before = b.content.substring(0, start);
      const after = b.content.substring(end);
      return { ...b, content: `${before}${wrapper}${selectedText}${wrapper}${after}` };
    }));
  };

  const insertVariable = (variable: string) => {
    navigator.clipboard.writeText(variable);
    setCopiedVar(variable);
    setTimeout(() => setCopiedVar(null), 2000);

    if (selectedBlockId) {
      const activeBlock = blocks.find(b => b.id === selectedBlockId);
      if (activeBlock && (activeBlock.type === 'text' || activeBlock.type === 'heading' || activeBlock.type === 'button' || activeBlock.type === 'banner' || activeBlock.type === 'footer')) {
        updateBlockContent(selectedBlockId, activeBlock.content + ' ' + variable);
      }
    }
  };

  const insertEmoji = (emoji: string) => {
    const targetId = selectedBlockId || blocks.find(b => b.type === 'text' || b.type === 'heading' || b.type === 'banner')?.id;
    if (targetId) {
      const target = blocks.find(b => b.id === targetId);
      if (target) {
        updateBlockContent(targetId, target.content + ' ' + emoji);
      }
    }
  };

  const handleSendTestEmail = async () => {
    const destination = prompt("Entrez l'adresse e-mail de destination pour recevoir ce modèle en conditions réelles :", senderEmail || 'mon-email@domaine.com');
    if (!destination || !destination.includes('@')) return;

    setIsSendingTest(true);
    setTestFeedback(null);

    try {
      const res = await fetch('/api/campaigns/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          testEmail: destination.trim(),
          subject: `[TEST] ${subject || 'Offre Spéciale Nanasore'}`,
          senderName,
          senderEmail,
          htmlContent: generateHtmlOutput(),
          segment: 'test'
        })
      });

      const data = await res.json().catch(() => ({}));

      if (res.ok && data.success) {
        setTestFeedback({
          type: 'success',
          msg: `E-mail de test expédié avec succès à ${destination} via l'API Brevo v3 !`
        });
      } else {
        setTestFeedback({
          type: 'error',
          msg: data.error || "Échec de l'envoi de l'e-mail de test."
        });
      }
    } catch {
      setTestFeedback({
        type: 'error',
        msg: "Erreur réseau lors de la communication avec l'API Brevo."
      });
    } finally {
      setIsSendingTest(false);
      setTimeout(() => setTestFeedback(null), 8000);
    }
  };

  // Génération du code HTML brut compatible Brevo, Gmail, Apple Mail et Outlook
  const generateHtmlOutput = () => {
    const isCardDark = cardBgColor.toLowerCase() === '#0f172a' || cardBgColor.toLowerCase() === '#1e293b';
    const defaultTextColor = isCardDark ? '#f8fafc' : '#1e293b';

    return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${subject || 'Campagne E-mailing Nanasore'}</title>
</head>
<body style="margin: 0; padding: 0; background-color: ${emailBgColor}; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: ${defaultTextColor}; -webkit-font-smoothing: antialiased;">
  <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: ${emailBgColor}; padding: 30px 10px;">
    <tr>
      <td align="center">
        <!-- Conteneur Carte Email Personnalisée -->
        <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 600px; background-color: ${cardBgColor}; border-radius: 20px; border: 1px solid ${isCardDark ? '#334155' : '#e2e8f0'}; overflow: hidden; box-shadow: 0 4px 14px rgba(0,0,0,0.04);">
          
          <!-- Corps de l'E-mail -->
          <tr>
            <td style="padding: 32px 32px 24px 32px;">
              ${blocks.map(b => {
                const align = b.styles?.align || 'left';
                const color = b.styles?.textColor || defaultTextColor;

                // BLOC : BANNIÈRE STYLISÉE (0 Ko OU HAUTE COMPRESSION)
                if (b.type === 'banner') {
                  const presetKey = b.bannerConfig?.gradientPreset || 'royal';
                  const preset = BANNER_PRESETS[presetKey] || BANNER_PRESETS['royal'];
                  const height = b.bannerConfig?.height || 'standard';
                  const padY = height === 'compact' ? '18px' : height === 'large' ? '36px' : '26px';
                  const titleSize = height === 'compact' ? '17px' : height === 'large' ? '24px' : '20px';
                  const bRadius = b.bannerConfig?.borderRadius === 'sharp' ? '0px' : '16px';
                  const textColor = preset.textColor || '#ffffff';
                  const subColor = preset.subtextColor || '#f8fafc';
                  const bgStyle = presetKey === 'image' && b.bannerConfig?.imageUrl
                    ? `background: linear-gradient(rgba(15, 23, 42, 0.72), rgba(15, 23, 42, 0.72)), url('${b.bannerConfig.imageUrl}'); background-size: cover; background-position: center;`
                    : `background: ${preset.gradient};`;

                  const parsedTitle = formatInlineLinks(b.content, textColor);

                  const contentHtml = `
                    <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="margin-bottom: 24px; border-radius: ${bRadius}; overflow: hidden; ${bgStyle} box-shadow: 0 4px 14px rgba(0,0,0,0.12);">
                      <tr>
                        <td align="center" style="padding: ${padY} 24px; text-align: center;">
                          ${b.bannerConfig?.badgeText ? `
                            <div style="margin-bottom: 8px;">
                              <span style="display: inline-block; background-color: ${preset.badgeBg}; color: ${textColor}; font-size: 10px; font-weight: 800; padding: 4px 12px; border-radius: 50px; text-transform: uppercase; letter-spacing: 0.6px; border: 1px solid rgba(255,255,255,0.35);">
                                ${b.bannerConfig.badgeText}
                              </span>
                            </div>` : ''}
                          <h2 style="margin: 0; color: ${textColor}; font-size: ${titleSize}; font-weight: 800; line-height: 1.3; letter-spacing: -0.3px;">
                            ${parsedTitle}
                          </h2>
                          ${b.bannerConfig?.subtitle ? `
                            <p style="margin: 8px 0 0 0; color: ${subColor}; font-size: 13px; font-weight: 500; opacity: 0.95; line-height: 1.4;">
                              ${formatInlineLinks(b.bannerConfig.subtitle, subColor)}
                            </p>` : ''}
                        </td>
                      </tr>
                    </table>`;

                  return b.url 
                    ? `<a href="${b.url}" target="_blank" style="text-decoration: none; display: block;">${contentHtml}</a>` 
                    : contentHtml;
                }

                // BLOC : LOGO HEADER
                if (b.type === 'logo') {
                  const width = b.logoWidth || 140;
                  const imgTag = `<img src="${b.content}" alt="Logo Boutique" style="max-width: ${width}px; height: auto; display: inline-block;" />`;
                  return `
                    <div style="text-align: ${align}; margin-bottom: 24px; padding-bottom: 12px;">
                      ${b.url ? `<a href="${b.url}" target="_blank" style="text-decoration: none;">${imgTag}</a>` : imgTag}
                    </div>`;
                }

                // BLOC : BADGE
                if (b.type === 'badge') {
                  return `
                    <div style="text-align: ${align}; margin-bottom: 18px;">
                      <span style="display: inline-block; background-color: ${b.styles?.backgroundColor || '#EFF6FF'}; color: ${color}; font-size: 11px; font-weight: 800; padding: 6px 14px; border-radius: 50px; text-transform: uppercase; letter-spacing: 0.5px; border: 1px solid #DBEAFE;">
                        ${b.content}
                      </span>
                    </div>`;
                }

                // BLOC : TITRES H1 / H2 / H3 (Avec support liens inline et lien global)
                if (b.type === 'heading') {
                  const level = b.headingLevel || 'h2';
                  const fontSize = b.styles?.fontSize === '2xl' ? '28px' : b.styles?.fontSize === 'xl' ? '22px' : b.styles?.fontSize === 'lg' ? '19px' : '17px';
                  const formattedContent = formatInlineLinks(b.content, color);
                  const inner = b.url 
                    ? `<a href="${b.url}" target="_blank" style="color: ${color}; text-decoration: none;">${formattedContent}</a>`
                    : formattedContent;

                  return `
                    <${level} style="color: ${color}; text-align: ${align}; font-size: ${fontSize}; font-weight: 800; line-height: 1.3; margin: 0 0 18px 0; letter-spacing: -0.4px;">
                      ${inner}
                    </${level}>`;
                }

                // BLOC : TEXTE / PARAGRAPHE (Avec support liens inline dans morceau et lien global)
                if (b.type === 'text') {
                  const fontSize = b.styles?.fontSize === 'lg' ? '17px' : b.styles?.fontSize === 'sm' ? '13px' : '15px';
                  const formattedContent = formatInlineLinks(b.content, '#2563EB');
                  const inner = b.url 
                    ? `<a href="${b.url}" target="_blank" style="color: inherit; text-decoration: none;">${formattedContent}</a>`
                    : formattedContent;

                  return `
                    <p style="font-size: ${fontSize}; line-height: 1.65; text-align: ${align}; color: ${color}; margin: 0 0 18px 0;">
                      ${inner}
                    </p>`;
                }

                // BLOC : IMAGE
                if (b.type === 'image') {
                  const imgTag = `<img src="${b.content}" alt="Visuel Campagne" style="max-width: 100%; height: auto; border-radius: 12px; display: block; margin: 0 auto; border: 1px solid #e2e8f0;" />`;
                  return `
                    <div style="text-align: ${align}; margin: 24px 0;">
                      ${b.url ? `<a href="${b.url}" target="_blank" style="text-decoration: none;">${imgTag}</a>` : imgTag}
                    </div>`;
                }

                // BLOC : BOUTON CTA
                if (b.type === 'button') {
                  return `
                    <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="margin: 28px 0;">
                      <tr>
                        <td align="${align}">
                          <a href="${b.url || 'https://nanasore.com'}" target="_blank" style="background-color: ${b.styles?.backgroundColor || '#2563EB'}; color: ${b.styles?.textColor || '#ffffff'}; padding: 14px 32px; border-radius: 12px; text-decoration: none; font-weight: 800; font-size: 14px; display: inline-block; letter-spacing: -0.2px; box-shadow: 0 4px 10px rgba(37,99,235,0.25);">
                            ${b.content}
                          </a>
                        </td>
                      </tr>
                    </table>`;
                }

                // BLOC : FOOTER LÉGAL (Avec support liens inline)
                if (b.type === 'footer') {
                  return `
                    <div style="border-top: 1px solid #f1f5f9; margin-top: 32px; padding-top: 20px; font-size: 11px; line-height: 1.6; color: #94a3b8; text-align: ${align};">
                      ${formatInlineLinks(b.content, '#2563EB')}
                    </div>`;
                }

                return '';
              }).join('')}
            </td>
          </tr>

          <!-- Pied de page officiel Nanasore -->
          <tr>
            <td style="padding: 16px 32px 24px 32px; background-color: ${isCardDark ? '#111827' : '#fafaf9'}; border-top: 1px solid ${isCardDark ? '#374151' : '#f1f5f9'}; text-align: center;">
              <p style="margin: 0; font-size: 10px; color: ${isCardDark ? '#9ca3af' : '#a8a29e'}; font-weight: 600;">
                Expédié avec la suite Nanasore E-mailing • Conforme RGPD & CAN-SPAM
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
  };

  const copyHtmlToClipboard = () => {
    navigator.clipboard.writeText(generateHtmlOutput());
    setCopiedHtml(true);
    setTimeout(() => setCopiedHtml(false), 2000);
  };

  const selectedBlock = blocks.find(b => b.id === selectedBlockId);

  // Extrait pour l'inbox
  const preheaderText = blocks.find(b => b.type === 'text')?.content.replace(/\[([^\]]+)\]\([^\)]+\)/g, '$1').slice(0, 75) || 'Découvrez nos promotions et nouveautés en exclusivité...';

  return (
    <div className="bg-white rounded-3xl border border-slate-200/80 shadow-sm overflow-hidden flex flex-col lg:flex-row min-h-[860px]">
      
      {/* =========================================================================
          PANNEAU GAUCHE : OUTILS, COULEUR DE FOND, BANNIÈRES, LIENS INLINE, BLOCS
         ========================================================================= */}
      <div className="w-full lg:w-5/12 p-6 border-r border-slate-200 space-y-6 bg-[#FBF9F5] overflow-y-auto max-h-[940px]">
        
        {/* Titre & Sous-titre */}
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-blue-600 animate-pulse" />
            <span className="text-[10px] font-black uppercase tracking-wider bg-blue-100 text-blue-700 px-2.5 py-0.5 rounded-full">
              Studio Pro 4.3 • Rich Links
            </span>
          </div>
          <h2 className="text-lg font-black text-slate-900 tracking-tight flex items-center gap-2">
            <Layout className="w-5 h-5 text-blue-600" /> Studio Éditeur & Blocs
          </h2>
          <p className="text-xs text-slate-500">
            Personnalisez vos fonds de mail, bannières 0 Ko, logo et insérez des liens dans n'importe quel morceau de texte.
          </p>
        </div>

        {/* Paramètres d'Expéditeur & Objet */}
        <div className="space-y-3 bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between">
            <h3 className="text-[11px] font-black uppercase tracking-wider text-slate-400">
              Paramètres de l'e-mail
            </h3>
            <span className="text-[10px] font-bold text-emerald-600 flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5" /> DKIM Certifié
            </span>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Nom de l'Expéditeur</label>
            <input 
              type="text" 
              value={senderName} 
              onChange={(e) => setSenderName(e.target.value)}
              placeholder="Ex: Ma Boutique Nanasore"
              className="w-full px-3 py-2 bg-[#FBF9F5] border border-slate-300 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-blue-600 focus:outline-none transition-all"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center justify-between">
              <span>E-mail d'Expéditeur & Réponse (Reply-To)</span>
              <span className="text-[10px] text-emerald-600 font-bold flex items-center gap-0.5">
                <ShieldCheck className="w-3 h-3" /> Recommandé
              </span>
            </label>
            <input 
              type="email" 
              value={senderEmail} 
              onChange={(e) => setSenderEmail(e.target.value)}
              placeholder="contact@maboutique.com"
              className="w-full px-3 py-2 bg-[#FBF9F5] border border-slate-300 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-blue-600 focus:outline-none transition-all"
            />
            <span className="text-[10px] text-slate-400 mt-0.5 block">
              Les réponses de vos clients arriveront directement sur cette boîte mail.
            </span>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Objet principal (Subject)</label>
            <input 
              type="text" 
              value={subject} 
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Ex: 🎉 Offre exclusive réservée à nos clients..."
              className="w-full px-3 py-2 bg-[#FBF9F5] border border-slate-300 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-blue-600 focus:outline-none transition-all"
            />
          </div>
        </div>

        {/* Personnalisation de la Couleur d'Arrière-Plan du Mail */}
        <div className="space-y-3 bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between">
            <h3 className="text-[11px] font-black uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
              <Paintbrush className="w-3.5 h-3.5 text-blue-600" /> Couleurs d'Arrière-Plan
            </h3>
            <span className="text-[10px] font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full">
              Thème Visuel
            </span>
          </div>

          {/* 1. Fond Externe */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-bold text-slate-700">Fond Externe du Mail</label>
              <div className="flex items-center gap-1.5">
                <input 
                  type="color" 
                  value={emailBgColor} 
                  onChange={(e) => setEmailBgColor(e.target.value)}
                  className="w-5 h-5 rounded cursor-pointer border border-slate-300 p-0"
                  title="Choisir une couleur personnalisée"
                />
                <span className="font-mono text-[10px] text-slate-500 font-bold">{emailBgColor}</span>
              </div>
            </div>

            <div className="grid grid-cols-6 gap-1.5">
              {[
                { label: 'Blanc Cassé Nanasore', value: '#FBF9F5', border: 'border-slate-300' },
                { label: 'Blanc Pur', value: '#FFFFFF', border: 'border-slate-300' },
                { label: 'Gris Ardoise Clair', value: '#F1F5F9', border: 'border-slate-300' },
                { label: 'Bleu Nuit Doux', value: '#0F172A', border: 'border-slate-700' },
                { label: 'Crème Dorée', value: '#FEF3C7', border: 'border-amber-300' },
                { label: 'Bleu Ciel Pastel', value: '#EFF6FF', border: 'border-blue-300' }
              ].map((bg) => (
                <button
                  key={bg.value}
                  type="button"
                  onClick={() => setEmailBgColor(bg.value)}
                  className={`h-7 rounded-lg border-2 transition-all cursor-pointer ${
                    emailBgColor.toLowerCase() === bg.value.toLowerCase() ? 'ring-2 ring-blue-600 ring-offset-1 scale-105' : bg.border
                  }`}
                  style={{ backgroundColor: bg.value }}
                  title={bg.label}
                />
              ))}
            </div>
          </div>

          {/* 2. Fond Carte Centrale */}
          <div className="pt-2 border-t border-slate-100">
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-bold text-slate-700">Fond Carte Contenu</label>
              <div className="flex items-center gap-1.5">
                <input 
                  type="color" 
                  value={cardBgColor} 
                  onChange={(e) => setCardBgColor(e.target.value)}
                  className="w-5 h-5 rounded cursor-pointer border border-slate-300 p-0"
                  title="Choisir une couleur personnalisée"
                />
                <span className="font-mono text-[10px] text-slate-500 font-bold">{cardBgColor}</span>
              </div>
            </div>

            <div className="grid grid-cols-4 gap-1.5">
              {[
                { label: 'Blanc Pur', value: '#FFFFFF', name: 'Blanc' },
                { label: 'Blanc Cassé', value: '#FAFAF9', name: 'Cassé' },
                { label: 'Crème Douce', value: '#FFFDF7', name: 'Crème' },
                { label: 'Ardoise Pro', value: '#1E293B', name: 'Sombre' }
              ].map((card) => (
                <button
                  key={card.value}
                  type="button"
                  onClick={() => setCardBgColor(card.value)}
                  className={`py-1.5 px-2 rounded-lg text-[10px] font-bold border transition-all cursor-pointer flex items-center justify-center gap-1 ${
                    cardBgColor.toLowerCase() === card.value.toLowerCase() 
                      ? 'bg-blue-600 text-white border-blue-600 shadow-xs' 
                      : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  <span className="w-2.5 h-2.5 rounded-full border border-slate-400" style={{ backgroundColor: card.value }} />
                  <span>{card.name}</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Bibliothèque de Blocs Modulaires */}
        <div className="space-y-3 bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between">
            <h3 className="text-[11px] font-black uppercase tracking-wider text-slate-400">
              Ajouter un bloc modulaire
            </h3>
            <span className="text-[10px] text-blue-600 font-bold">9 types</span>
          </div>

          <div className="grid grid-cols-2 gap-2">
            {/* Bloc Bannière Stylisée */}
            <button 
              type="button"
              onClick={() => addBlock('banner')} 
              className="col-span-2 p-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-xl text-xs font-black flex items-center justify-center gap-2 shadow-sm transition-all cursor-pointer hover:shadow-md active:scale-98"
            >
              <Sparkles className="w-4 h-4 text-amber-300" />
              <span>Bannière Stylisée (0 Ko / Compressée)</span>
            </button>

            {/* Bloc Logo Header */}
            <button 
              type="button"
              onClick={() => addBlock('logo')} 
              className="p-2.5 bg-blue-50/50 hover:bg-blue-100/60 border border-blue-200 rounded-xl text-xs font-black text-blue-800 flex items-center gap-2 transition-all cursor-pointer"
            >
              <ImageIcon className="w-4 h-4 text-blue-600" /> Logo Header
            </button>

            {/* Bloc Titre */}
            <button 
              type="button"
              onClick={() => addBlock('heading')} 
              className="p-2.5 bg-[#FBF9F5] hover:bg-blue-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 flex items-center gap-2 transition-all cursor-pointer hover:border-blue-300"
            >
              <Type className="w-4 h-4 text-blue-600" /> Titre (H1/H2/H3)
            </button>

            {/* Bloc Texte */}
            <button 
              type="button"
              onClick={() => addBlock('text')} 
              className="p-2.5 bg-[#FBF9F5] hover:bg-blue-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 flex items-center gap-2 transition-all cursor-pointer hover:border-blue-300"
            >
              <FileText className="w-4 h-4 text-blue-600" /> Paragraphe
            </button>

            {/* Bloc Bouton CTA */}
            <button 
              type="button"
              onClick={() => addBlock('button')} 
              className="p-2.5 bg-[#FBF9F5] hover:bg-blue-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 flex items-center gap-2 transition-all cursor-pointer hover:border-blue-300"
            >
              <Zap className="w-4 h-4 text-blue-600" /> Bouton CTA
            </button>

            {/* Bloc Image */}
            <button 
              type="button"
              onClick={() => addBlock('image')} 
              className="p-2.5 bg-[#FBF9F5] hover:bg-blue-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 flex items-center gap-2 transition-all cursor-pointer hover:border-blue-300"
            >
              <ImageIcon className="w-4 h-4 text-blue-600" /> Image URL
            </button>

            {/* Bloc Badge */}
            <button 
              type="button"
              onClick={() => addBlock('badge')} 
              className="p-2.5 bg-[#FBF9F5] hover:bg-blue-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 flex items-center gap-2 transition-all cursor-pointer hover:border-blue-300"
            >
              <Tag className="w-4 h-4 text-blue-600" /> Badge Promo
            </button>

            {/* Bloc Footer Légal */}
            <button 
              type="button"
              onClick={() => addBlock('footer')} 
              className="col-span-2 p-2.5 bg-[#FBF9F5] hover:bg-blue-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 flex items-center justify-center gap-2 transition-all cursor-pointer hover:border-blue-300"
            >
              <Layout className="w-4 h-4 text-blue-600" /> Footer Légal & Désabonnement
            </button>
          </div>
        </div>

        {/* =====================================================================
            BARRE D'ÉDITION DU BLOC SÉLECTIONNÉ (BANNIÈRE, H1/H2/H3, LIENS, STYLES)
           ===================================================================== */}
        {selectedBlock && (
          <div className="space-y-3 bg-white p-4 rounded-2xl border-2 border-blue-600/30 shadow-xs animate-in fade-in">
            <div className="flex items-center justify-between">
              <h3 className="text-[11px] font-black uppercase tracking-wider text-blue-700 flex items-center gap-1.5">
                <Sliders className="w-3.5 h-3.5" /> Configuration Bloc ({selectedBlock.type})
              </h3>
              <span className="text-[10px] text-blue-600 font-bold bg-blue-50 px-2 py-0.5 rounded-full">
                Actif
              </span>
            </div>

            {/* Configuration spécifique Bannière */}
            {selectedBlock.type === 'banner' && (
              <div className="space-y-3 pt-1">
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1.5 flex items-center gap-1">
                    <Layers className="w-3.5 h-3.5 text-blue-600" /> Positionnement dans le Header
                  </label>
                  <div className="grid grid-cols-2 gap-1.5">
                    <button
                      type="button"
                      onClick={() => placeBannerPosition(selectedBlock.id, false)}
                      className="px-2.5 py-1.5 bg-[#FBF9F5] hover:bg-blue-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 hover:text-blue-600 transition-all cursor-pointer text-center"
                    >
                      🔝 Tout en haut (Header)
                    </button>
                    <button
                      type="button"
                      onClick={() => placeBannerPosition(selectedBlock.id, true)}
                      className="px-2.5 py-1.5 bg-[#FBF9F5] hover:bg-blue-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 hover:text-blue-600 transition-all cursor-pointer text-center"
                    >
                      👇 Sous le Logo Header
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1.5 flex items-center justify-between">
                    <span>Style Graphique de la Bannière</span>
                    <span className="text-[9px] font-bold text-emerald-600">⚡ 0 Ko / Poids Plume</span>
                  </label>
                  <div className="grid grid-cols-2 gap-1.5">
                    {Object.entries(BANNER_PRESETS).map(([key, preset]) => {
                      const isActive = (selectedBlock.bannerConfig?.gradientPreset || 'royal') === key;
                      return (
                        <button
                          key={key}
                          type="button"
                          onClick={() => updateBannerConfig(selectedBlock.id, { gradientPreset: key as any })}
                          className={`p-2 rounded-xl text-left border transition-all cursor-pointer flex flex-col justify-between ${
                            isActive ? 'ring-2 ring-blue-600 border-blue-600 shadow-xs' : 'border-slate-200 hover:border-slate-300'
                          }`}
                        >
                          <div 
                            className="h-5 rounded-md mb-1.5 w-full flex items-center justify-center text-[9px] font-black text-white"
                            style={{ background: preset.gradient }}
                          >
                            Aa
                          </div>
                          <span className="text-[10px] font-bold text-slate-800 truncate">{preset.name}</span>
                          <span className="text-[9px] text-slate-400 font-medium">{preset.weightLabel}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {selectedBlock.bannerConfig?.gradientPreset === 'image' && (
                  <div className="p-3 bg-blue-50/50 rounded-xl border border-blue-200 space-y-2">
                    <label className="block text-[10px] font-bold text-blue-900">
                      URL de l'image de bannière compressée
                    </label>
                    <input 
                      type="url"
                      value={selectedBlock.bannerConfig?.imageUrl || ''}
                      onChange={(e) => updateBannerConfig(selectedBlock.id, { imageUrl: e.target.value })}
                      placeholder="https://images.unsplash.com/...&auto=format&fit=crop&q=70&w=600"
                      className="w-full px-2.5 py-1.5 bg-white border border-blue-300 rounded-lg text-xs font-mono"
                    />
                  </div>
                )}

                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">
                    Format & Hauteur de Bannière
                  </label>
                  <div className="grid grid-cols-3 gap-1 bg-[#FBF9F5] p-1 rounded-xl border border-slate-200">
                    {[
                      { id: 'compact', label: 'Compacte (75px)' },
                      { id: 'standard', label: 'Standard (120px)' },
                      { id: 'large', label: 'Large (170px)' }
                    ].map((h) => (
                      <button
                        key={h.id}
                        type="button"
                        onClick={() => updateBannerConfig(selectedBlock.id, { height: h.id as any })}
                        className={`py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                          (selectedBlock.bannerConfig?.height || 'standard') === h.id
                            ? 'bg-blue-600 text-white shadow-xs'
                            : 'text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        {h.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Sélecteur H1 / H2 / H3 pour les titres */}
            {selectedBlock.type === 'heading' && (
              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1.5">
                  Niveau & Taille du Titre
                </label>
                <div className="grid grid-cols-3 gap-1.5 bg-[#FBF9F5] p-1 rounded-xl border border-slate-200">
                  {(['h1', 'h2', 'h3'] as const).map((lvl) => (
                    <button
                      key={lvl}
                      type="button"
                      onClick={() => updateHeadingLevel(selectedBlock.id, lvl)}
                      className={`py-1.5 rounded-lg text-xs font-black uppercase transition-all flex items-center justify-center gap-1 cursor-pointer ${
                        (selectedBlock.headingLevel || 'h2') === lvl
                          ? 'bg-blue-600 text-white shadow-xs'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      {lvl === 'h1' && <Heading1 className="w-3.5 h-3.5" />}
                      {lvl === 'h2' && <Heading2 className="w-3.5 h-3.5" />}
                      {lvl === 'h3' && <Heading3 className="w-3.5 h-3.5" />}
                      <span>{lvl.toUpperCase()}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Taille de Logo */}
            {selectedBlock.type === 'logo' && (
              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1.5">
                  Largeur du Logo (pixels)
                </label>
                <div className="grid grid-cols-3 gap-1.5 bg-[#FBF9F5] p-1 rounded-xl border border-slate-200">
                  {[120, 160, 200].map((w) => (
                    <button
                      key={w}
                      type="button"
                      onClick={() => updateLogoWidth(selectedBlock.id, w)}
                      className={`py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                        (selectedBlock.logoWidth || 150) === w
                          ? 'bg-blue-600 text-white shadow-xs'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      {w} px
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* =================================================================
                SECTION ULTRA-COMPLÈTE : LIENS HYPERTEXTES (INLINE + BLOC ENTIER)
               ================================================================= */}
            {(selectedBlock.type === 'text' || selectedBlock.type === 'heading' || selectedBlock.type === 'footer' || selectedBlock.type === 'testimonial' || selectedBlock.type === 'banner' || selectedBlock.type === 'image' || selectedBlock.type === 'logo') && (
              <div className="space-y-3 pt-2 border-t border-slate-100">
                
                {/* 1. LIEN SUR UN MORCEAU DE TEXTE SPÉCIFIQUE (Pour texte, titre, footer) */}
                {(selectedBlock.type === 'text' || selectedBlock.type === 'heading' || selectedBlock.type === 'footer' || selectedBlock.type === 'testimonial') && (
                  <div className="bg-blue-50/60 p-3 rounded-2xl border border-blue-200 space-y-2.5">
                    <div className="flex items-center justify-between">
                      <label className="text-[11px] font-black uppercase tracking-wider text-blue-900 flex items-center gap-1.5">
                        <Link className="w-3.5 h-3.5 text-blue-600" /> Lien dans un morceau de texte
                      </label>
                      <span className="text-[9px] font-extrabold text-blue-700 bg-white px-2 py-0.5 rounded-full border border-blue-200">
                        Nouveau
                      </span>
                    </div>

                    <p className="text-[11px] text-slate-600 leading-snug">
                      Surlignez un mot ou une phrase dans l'éditeur, puis cliquez ci-dessous pour le transformer en lien cliquable.
                    </p>

                    {textSelection && textSelection.blockId === selectedBlock.id && textSelection.selectedText.trim() ? (
                      <div className="space-y-2 bg-white p-2.5 rounded-xl border border-blue-300 shadow-2xs animate-in fade-in">
                        <div className="text-[11px] text-slate-700">
                          Texte sélectionné : <strong className="text-blue-700 bg-blue-100/70 px-1.5 py-0.5 rounded font-bold">« {textSelection.selectedText} »</strong>
                        </div>
                        <button
                          type="button"
                          onClick={() => openInlineLinkModal(selectedBlock.id)}
                          className="w-full py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-black shadow-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer active:scale-98"
                        >
                          <Link className="w-3.5 h-3.5" />
                          <span>Transformer « {textSelection.selectedText.slice(0, 18)}... » en lien</span>
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => openInlineLinkModal(selectedBlock.id)}
                        className="w-full py-2 bg-white hover:bg-blue-100/60 text-blue-700 border border-blue-300 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-2xs hover:shadow-xs"
                      >
                        <Plus className="w-3.5 h-3.5 text-blue-600" />
                        <span>Insérer un lien sur un mot ou phrase</span>
                      </button>
                    )}

                    {/* Liste des liens inline détectés dans ce texte */}
                    {extractInlineLinks(selectedBlock.content).length > 0 && (
                      <div className="space-y-1.5 pt-1 border-t border-blue-200/60">
                        <span className="text-[10px] font-black uppercase tracking-wider text-slate-500 block">
                          Liens actifs dans ce texte ({extractInlineLinks(selectedBlock.content).length}) :
                        </span>
                        <div className="space-y-1 max-h-28 overflow-y-auto pr-1">
                          {extractInlineLinks(selectedBlock.content).map((lnk, idx) => (
                            <div key={idx} className="flex items-center justify-between bg-white px-2.5 py-1.5 rounded-xl border border-slate-200 text-xs shadow-2xs">
                              <div className="truncate mr-2 min-w-0">
                                <span className="text-blue-700 font-bold underline mr-1.5">{lnk.label}</span>
                                <span className="text-[10px] text-slate-400 font-mono truncate">➔ {lnk.url}</span>
                              </div>
                              <button
                                type="button"
                                onClick={() => removeInlineLink(selectedBlock.id, lnk.fullMatch, lnk.label)}
                                className="text-rose-500 hover:text-rose-700 text-[10px] font-extrabold px-1.5 py-0.5 rounded hover:bg-rose-50 cursor-pointer shrink-0 transition"
                                title="Supprimer ce lien hypertexte"
                              >
                                Délier
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* 2. RENDRE TOUT LE BLOC CLIQUABLE (Lien global conservé) */}
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1 flex items-center justify-between">
                    <span className="flex items-center gap-1">
                      <ExternalLink className="w-3.5 h-3.5 text-slate-500" />
                      <span>Rendre tout le bloc cliquable (Lien global)</span>
                    </span>
                    <span className="text-[9px] text-slate-400 font-medium">Optionnel</span>
                  </label>
                  <input 
                    type="url"
                    value={selectedBlock.url || ''}
                    onChange={(e) => updateBlockUrl(selectedBlock.id, e.target.value)}
                    placeholder="https://maboutique.com/page-complete ou https://wa.me/..."
                    className="w-full px-3 py-2 bg-[#FBF9F5] border border-slate-300 rounded-xl text-xs font-mono text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-600"
                  />
                  <span className="text-[10px] text-slate-400 mt-0.5 block">
                    {selectedBlock.url 
                      ? '✓ Redirection globale active au clic sur le bloc entier.' 
                      : 'Laissez vide si vous souhaitez uniquement des liens sur des mots spécifiques.'}
                  </span>
                </div>

              </div>
            )}

            {/* Sélecteur de Taille de Police */}
            {selectedBlock.type === 'text' && (
              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1.5">Taille de Police</label>
                <div className="grid grid-cols-3 gap-1.5 bg-[#FBF9F5] p-1 rounded-xl border border-slate-200">
                  {(['sm', 'md', 'lg'] as const).map((sz) => (
                    <button
                      key={sz}
                      type="button"
                      onClick={() => updateBlockStyles(selectedBlock.id, { fontSize: sz })}
                      className={`py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                        (selectedBlock.styles?.fontSize || 'md') === sz
                          ? 'bg-blue-600 text-white shadow-xs'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      {sz === 'sm' ? 'Petite (13px)' : sz === 'md' ? 'Normale (15px)' : 'Grande (17px)'}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Alignements */}
            <div className="flex items-center gap-1 bg-[#FBF9F5] p-1 rounded-xl border border-slate-200">
              <button
                type="button"
                onClick={() => updateBlockStyles(selectedBlock.id, { align: 'left' })}
                className={`flex-1 py-1 rounded-lg text-xs font-bold flex items-center justify-center ${
                  selectedBlock.styles?.align === 'left' ? 'bg-white text-blue-600 shadow-xs' : 'text-slate-500'
                }`}
                title="Aligner à gauche"
              >
                <AlignLeft className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => updateBlockStyles(selectedBlock.id, { align: 'center' })}
                className={`flex-1 py-1 rounded-lg text-xs font-bold flex items-center justify-center ${
                  selectedBlock.styles?.align === 'center' ? 'bg-white text-blue-600 shadow-xs' : 'text-slate-500'
                }`}
                title="Centrer"
              >
                <AlignCenter className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => updateBlockStyles(selectedBlock.id, { align: 'right' })}
                className={`flex-1 py-1 rounded-lg text-xs font-bold flex items-center justify-center ${
                  selectedBlock.styles?.align === 'right' ? 'bg-white text-blue-600 shadow-xs' : 'text-slate-500'
                }`}
                title="Aligner à droite"
              >
                <AlignRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Palette de Couleurs */}
            {selectedBlock.type !== 'banner' && (
              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1.5">Couleur du texte</label>
                <div className="flex items-center gap-2">
                  {colorPresets.map((c) => (
                    <button
                      key={c.value}
                      type="button"
                      onClick={() => updateBlockStyles(selectedBlock.id, { textColor: c.value })}
                      className={`w-6 h-6 rounded-full border-2 transition-all cursor-pointer ${
                        selectedBlock.styles?.textColor === c.value ? 'ring-2 ring-blue-500 ring-offset-2 scale-110' : 'border-white'
                      }`}
                      style={{ backgroundColor: c.value }}
                      title={c.label}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Variables Dynamiques & Emojis Rapides */}
        <div className="space-y-3 bg-blue-50/60 p-4 rounded-2xl border border-blue-200">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-extrabold uppercase tracking-wider text-blue-900 flex items-center gap-1.5">
              <Smile className="w-4 h-4 text-blue-600" /> Balises & Emojis Rapides
            </h3>
            <span className="text-[10px] text-blue-700 font-bold">1-Clic Copie</span>
          </div>

          {/* Variables cliquables */}
          <div className="flex flex-wrap gap-1.5">
            {['{{FIRSTNAME}}', '{{LASTNAME}}', '{{SHOP_NAME}}', '{{PROMO_CODE}}'].map((variable) => (
              <button
                key={variable}
                type="button"
                onClick={() => insertVariable(variable)}
                className="px-2.5 py-1 bg-white border border-blue-300 text-blue-700 font-mono text-[10px] font-bold rounded-lg shadow-xs hover:bg-blue-600 hover:text-white transition-all cursor-pointer flex items-center gap-1"
                title="Cliquez pour insérer dans le bloc sélectionné"
              >
                {copiedVar === variable ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                {variable}
              </button>
            ))}
          </div>

          {/* Palette d'émojis marketing */}
          <div className="flex flex-wrap gap-1.5 pt-1">
            {['🔥', '🚀', '⭐', '💡', '🎉', '👇', '✅', '🎁', '⚡', '📦', '🛒'].map((emoji) => (
              <button
                key={emoji}
                type="button"
                onClick={() => insertEmoji(emoji)}
                className="w-8 h-8 bg-white border border-slate-200 rounded-lg text-sm flex items-center justify-center hover:bg-blue-100 transition-all cursor-pointer shadow-xs hover:scale-110"
                title={`Insérer ${emoji}`}
              >
                {emoji}
              </button>
            ))}
          </div>
        </div>

        {/* Bouton de sauvegarde principale */}
        <button
          type="button"
          onClick={() => onTemplateSave(generateHtmlOutput(), subject, senderName, senderEmail)}
          className="w-full py-4 bg-blue-600 hover:bg-blue-700 text-white font-black text-sm rounded-xl shadow-lg shadow-blue-500/25 transition-all flex items-center justify-center gap-2 cursor-pointer hover:-translate-y-0.5 active:translate-y-0"
        >
          <Send className="w-4 h-4" />
          Enregistrer le modèle & Passer à la diffusion
        </button>

        {/* Bouton secondaire : Envoyer un e-mail de test via Brevo */}
        <div className="pt-1">
          {testFeedback && (
            <div className={`p-3 mb-2 rounded-xl text-xs font-bold flex items-center gap-2 ${
              testFeedback.type === 'success' 
                ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' 
                : 'bg-rose-50 text-rose-800 border border-rose-200'
            }`}>
              {testFeedback.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              ) : (
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              )}
              <span>{testFeedback.msg}</span>
            </div>
          )}

          <button
            type="button"
            disabled={isSendingTest}
            onClick={handleSendTestEmail}
            className="w-full py-2.5 bg-white hover:bg-slate-50 border border-slate-300 text-slate-700 font-bold text-xs rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer shadow-2xs hover:border-slate-400"
            title="Envoyer un exemplaire sur votre boîte mail pour vérifier le rendu"
          >
            {isSendingTest ? (
              <>
                <RefreshCw className="w-3.5 h-3.5 animate-spin text-blue-600" />
                <span>Envoi du test en cours via Brevo...</span>
              </>
            ) : (
              <>
                <Mail className="w-3.5 h-3.5 text-blue-600" />
                <span>Envoyer un e-mail de test sur ma boîte</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* =========================================================================
          PANNEAU DROITE : PREVIEW EN HAUT & BOÎTE MAIL SIMULÉE
         ========================================================================= */}
      <div className="w-full lg:w-7/12 bg-slate-100 p-6 flex flex-col justify-between">
        
        {/* BARRE DE PRÉVISUALISATION SUPÉRIEURE AVEC BOUTON "VOIR DANS LA BOÎTE MAIL" */}
        <div className="flex flex-wrap items-center justify-between gap-3 bg-white px-4 py-3 rounded-2xl border border-slate-200 mb-4 shadow-xs">
          
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-xs font-bold text-slate-800">Aperçu en Temps Réel</span>
            
            {/* BOUTON CLÉ : SIMULATEUR DE BOÎTE MAIL RÉELLE */}
            <button
              type="button"
              onClick={() => setIsInboxModalOpen(true)}
              className="ml-2 px-3 py-1 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-xl text-xs font-black shadow-xs flex items-center gap-1.5 transition-all cursor-pointer active:scale-95"
              title="Tester l'apparence dans la boîte de réception de vos clients"
            >
              <Inbox className="w-3.5 h-3.5" />
              <span>Voir dans la Boîte Mail (Inbox)</span>
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button 
              type="button"
              onClick={() => setActiveTab('visual')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                activeTab === 'visual' ? 'bg-blue-600 text-white shadow-xs' : 'text-slate-600 bg-slate-100 hover:bg-slate-200'
              }`}
            >
              <Eye className="w-3.5 h-3.5" />
              <span>Visuel</span>
            </button>
            <button 
              type="button"
              onClick={() => setActiveTab('code')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                activeTab === 'code' ? 'bg-blue-600 text-white shadow-xs' : 'text-slate-600 bg-slate-100 hover:bg-slate-200'
              }`}
            >
              <Code className="w-3.5 h-3.5" />
              <span>HTML Brut</span>
            </button>
            
            <div className="h-4 w-px bg-slate-200 mx-1 hidden sm:block" />

            <div className="flex items-center bg-slate-100 p-1 rounded-xl">
              <button 
                type="button"
                onClick={() => setPreviewMode('desktop')} 
                className={`p-1.5 rounded-lg transition-all cursor-pointer ${
                  previewMode === 'desktop' ? 'bg-white shadow-xs text-blue-600' : 'text-slate-400 hover:text-slate-600'
                }`}
                title="Vue Ordinateur"
              >
                <Monitor className="w-4 h-4" />
              </button>
              <button 
                type="button"
                onClick={() => setPreviewMode('mobile')} 
                className={`p-1.5 rounded-lg transition-all cursor-pointer ${
                  previewMode === 'mobile' ? 'bg-white shadow-xs text-blue-600' : 'text-slate-400 hover:text-slate-600'
                }`}
                title="Vue Smartphone"
              >
                <Smartphone className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* CONTAINER DE L'ÉDITEUR AVEC FOND PERSONNALISÉ */}
        <div 
          className="flex-1 flex items-center justify-center overflow-auto p-4 transition-colors duration-300 rounded-2xl border border-slate-200/60"
          style={{ backgroundColor: emailBgColor }}
        >
          <div 
            style={{ backgroundColor: cardBgColor }}
            className={`shadow-2xl rounded-2xl overflow-hidden transition-all duration-300 flex flex-col border border-slate-300/80 ${
              previewMode === 'mobile' ? 'w-[375px] min-h-[640px]' : 'w-full max-w-xl min-h-[640px]'
            }`}
          >
            
            {/* Header du simulateur */}
            <div className="bg-white/80 backdrop-blur-xs border-b border-slate-200 px-4 py-3 flex items-center justify-between text-xs font-semibold text-slate-500">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-[10px] font-black">
                  {senderName.charAt(0).toUpperCase()}
                </div>
                <span>De : <strong className="text-slate-900">{senderName}</strong> <span className="text-[10px] text-slate-400 font-mono">&lt;{senderEmail}&gt;</span></span>
              </div>
              <span className="truncate max-w-[200px] text-slate-600 font-medium">
                Objet : {subject || '(Sans objet)'}
              </span>
            </div>

            {/* Contenu visuel des blocs ou code HTML */}
            <div className="p-5 space-y-3.5 flex-1 overflow-y-auto max-h-[620px]">
              {activeTab === 'visual' ? (
                blocks.map((block) => {
                  const isSelected = selectedBlockId === block.id;

                  return (
                    <div 
                      key={block.id} 
                      onClick={() => setSelectedBlockId(block.id)}
                      className={`relative group bg-white p-4 rounded-2xl border transition-all space-y-2 select-none ${
                        isSelected 
                          ? 'border-blue-600 ring-2 ring-blue-500/20 shadow-md' 
                          : 'border-slate-200/80 hover:border-slate-300 shadow-xs'
                      }`}
                    >
                      {/* Actions rapides sur le bloc */}
                      <div className="absolute right-3 top-3 flex items-center gap-1 opacity-70 group-hover:opacity-100 transition-opacity z-10">
                        <button 
                          type="button"
                          onClick={(e) => { e.stopPropagation(); moveBlock(block.id, 'up'); }}
                          className="p-1 text-slate-400 hover:text-slate-700 rounded hover:bg-slate-100 cursor-pointer"
                          title="Monter le bloc"
                        >
                          <ArrowUp className="w-3.5 h-3.5" />
                        </button>
                        <button 
                          type="button"
                          onClick={(e) => { e.stopPropagation(); moveBlock(block.id, 'down'); }}
                          className="p-1 text-slate-400 hover:text-slate-700 rounded hover:bg-slate-100 cursor-pointer"
                          title="Descendre le bloc"
                        >
                          <ArrowDown className="w-3.5 h-3.5" />
                        </button>
                        <button 
                          type="button"
                          onClick={(e) => { e.stopPropagation(); removeBlock(block.id); }} 
                          className="p-1 text-rose-500 hover:text-rose-700 rounded hover:bg-rose-50 cursor-pointer ml-1"
                          title="Supprimer le bloc"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      <div className="flex items-center gap-2 text-[10px] uppercase font-black text-slate-400 tracking-wider">
                        <span>Bloc • {block.type === 'banner' ? 'Bannière Stylisée 0 Ko' : block.type}</span>
                        {block.url && (
                          <span className="text-blue-600 font-bold lowercase flex items-center gap-0.5">
                            <ExternalLink className="w-2.5 h-2.5" /> bloc entier cliquable
                          </span>
                        )}
                        {extractInlineLinks(block.content).length > 0 && (
                          <span className="text-emerald-600 font-bold lowercase flex items-center gap-0.5">
                            <Link className="w-2.5 h-2.5" /> {extractInlineLinks(block.content).length} lien(s) de texte
                          </span>
                        )}
                      </div>

                      {/* BLOC BANNIÈRE STYLISÉE */}
                      {block.type === 'banner' && (
                        <div className="space-y-2">
                          <div 
                            style={{
                              borderRadius: block.bannerConfig?.borderRadius === 'sharp' ? '0px' : '14px',
                              background: block.bannerConfig?.gradientPreset === 'image' && block.bannerConfig?.imageUrl
                                ? `linear-gradient(rgba(15, 23, 42, 0.72), rgba(15, 23, 42, 0.72)), url('${block.bannerConfig.imageUrl}') center/cover`
                                : (BANNER_PRESETS[block.bannerConfig?.gradientPreset || 'royal']?.gradient || BANNER_PRESETS.royal.gradient),
                              color: BANNER_PRESETS[block.bannerConfig?.gradientPreset || 'royal']?.textColor || '#ffffff',
                              padding: block.bannerConfig?.height === 'compact' ? '14px 16px' : block.bannerConfig?.height === 'large' ? '28px 20px' : '20px 18px'
                            }}
                            className="text-center shadow-md relative overflow-hidden transition-all rounded-2xl"
                          >
                            <div className="absolute top-2 right-2">
                              <span className="text-[9px] font-black bg-black/40 backdrop-blur-xs text-white px-2 py-0.5 rounded-full flex items-center gap-1 border border-white/20">
                                <Zap className="w-2.5 h-2.5 text-amber-300" />
                                {BANNER_PRESETS[block.bannerConfig?.gradientPreset || 'royal']?.weightLabel || '⚡ 0 Ko'}
                              </span>
                            </div>

                            {block.bannerConfig?.badgeText && (
                              <span className="inline-block text-[9px] font-black tracking-wider uppercase bg-white/20 backdrop-blur-xs px-2.5 py-0.5 rounded-full mb-1.5 border border-white/30">
                                {block.bannerConfig.badgeText}
                              </span>
                            )}

                            <h3 className="font-black text-sm md:text-base leading-tight">
                              {block.content}
                            </h3>

                            {block.bannerConfig?.subtitle && (
                              <p className="text-[11px] opacity-90 mt-1 font-medium">
                                {block.bannerConfig.subtitle}
                              </p>
                            )}
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 pt-1">
                            <div>
                              <input 
                                type="text"
                                value={block.content}
                                onChange={(e) => updateBlockContent(block.id, e.target.value)}
                                placeholder="Titre de la bannière..."
                                className="w-full text-xs font-bold text-slate-800 bg-slate-50 border border-slate-200 rounded-xl p-2 focus:outline-none"
                              />
                            </div>
                            <div>
                              <input 
                                type="text"
                                value={block.bannerConfig?.subtitle || ''}
                                onChange={(e) => updateBannerConfig(block.id, { subtitle: e.target.value })}
                                placeholder="Sous-titre / Slogan..."
                                className="w-full text-xs text-slate-700 bg-slate-50 border border-slate-200 rounded-xl p-2 focus:outline-none"
                              />
                            </div>
                          </div>
                        </div>
                      )}

                      {/* BLOC : LOGO HEADER */}
                      {block.type === 'logo' && (
                        <div className="space-y-2">
                          <input 
                            type="text" 
                            value={block.content} 
                            onChange={(e) => updateBlockContent(block.id, e.target.value)}
                            placeholder="URL du Logo de la Boutique (https://...)"
                            className="w-full text-xs font-mono text-slate-600 bg-slate-50 border border-slate-200 rounded-xl p-2 focus:outline-none"
                          />
                          <div style={{ textAlign: block.styles?.align || 'center' }} className="py-2">
                            <img 
                              src={block.content} 
                              alt="Logo" 
                              style={{ maxWidth: `${block.logoWidth || 150}px` }} 
                              className="inline-block object-contain" 
                              onError={(e) => { (e.target as HTMLElement).style.display = 'none'; }} 
                            />
                          </div>
                        </div>
                      )}

                      {/* BLOC : BADGE */}
                      {block.type === 'badge' && (
                        <div style={{ textAlign: block.styles?.align || 'center' }}>
                          <input
                            type="text"
                            value={block.content}
                            onChange={(e) => updateBlockContent(block.id, e.target.value)}
                            className="font-extrabold text-xs text-blue-600 bg-blue-50 border border-blue-200 rounded-full px-3 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500 text-center uppercase tracking-wider"
                          />
                        </div>
                      )}

                      {/* BLOC : TITRES H1 / H2 / H3 */}
                      {block.type === 'heading' && (
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <button
                              type="button"
                              onClick={() => openInlineLinkModal(block.id)}
                              className="px-2 py-0.5 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 rounded-md text-[10px] font-bold flex items-center gap-1 transition cursor-pointer"
                              title="Sélectionnez un mot dans le titre et cliquez ici"
                            >
                              <Link className="w-2.5 h-2.5" /> Lier un mot
                            </button>
                            {extractInlineLinks(block.content).length > 0 && (
                              <span className="text-[10px] text-blue-600 font-bold">
                                {extractInlineLinks(block.content).length} lien(s) de texte
                              </span>
                            )}
                          </div>
                          <input 
                            type="text" 
                            value={block.content} 
                            onSelect={(e) => handleTextSelect(block.id, e)}
                            onKeyUp={(e) => handleTextSelect(block.id, e)}
                            onMouseUp={(e) => handleTextSelect(block.id, e)}
                            onChange={(e) => updateBlockContent(block.id, e.target.value)}
                            style={{
                              textAlign: block.styles?.align || 'center',
                              color: block.styles?.textColor || '#2563EB',
                              fontSize: block.headingLevel === 'h1' ? '1.25rem' : block.headingLevel === 'h3' ? '0.95rem' : '1.1rem'
                            }}
                            className="w-full font-black bg-transparent border-b border-dashed border-slate-300 focus:outline-none focus:border-blue-600"
                          />
                          {/* Rendu dynamique du titre avec ses liens hypertextes */}
                          <div 
                            style={{ textAlign: block.styles?.align || 'center' }}
                            className="text-xs text-slate-500 pt-0.5"
                            dangerouslySetInnerHTML={{ __html: formatInlineLinks(block.content, block.styles?.textColor || '#2563EB') }}
                          />
                        </div>
                      )}

                      {/* BLOC : TEXTE / PARAGRAPHE AVEC BARRE D'OUTIL LIEN INLINE */}
                      {block.type === 'text' && (
                        <div className="space-y-2">
                          
                          {/* Mini Barre d'outil de mise en forme & lien sur morceau de texte */}
                          <div className="flex items-center justify-between bg-slate-50/80 px-2.5 py-1.5 rounded-xl border border-slate-200">
                            <div className="flex items-center gap-1.5">
                              <button
                                type="button"
                                onClick={() => openInlineLinkModal(block.id)}
                                className="px-2.5 py-1 bg-white hover:bg-blue-50 text-blue-700 border border-blue-200 rounded-lg text-xs font-bold flex items-center gap-1 transition cursor-pointer shadow-2xs hover:border-blue-300"
                                title="Surlignez un morceau de texte et cliquez pour le transformer en lien"
                              >
                                <Link className="w-3 h-3 text-blue-600" />
                                <span>Transformer sélection en lien</span>
                              </button>

                              <button
                                type="button"
                                onClick={() => wrapSelectionWith(block.id, '**')}
                                className="w-7 h-7 hover:bg-white text-slate-700 rounded-lg text-xs font-black flex items-center justify-center transition cursor-pointer border border-transparent hover:border-slate-200"
                                title="Mettre en gras (**texte**)"
                              >
                                <Bold className="w-3.5 h-3.5" />
                              </button>

                              <button
                                type="button"
                                onClick={() => wrapSelectionWith(block.id, '*')}
                                className="w-7 h-7 hover:bg-white text-slate-700 rounded-lg text-xs font-italic flex items-center justify-center transition cursor-pointer border border-transparent hover:border-slate-200"
                                title="Mettre en italique (*texte*)"
                              >
                                <Italic className="w-3.5 h-3.5" />
                              </button>
                            </div>

                            {extractInlineLinks(block.content).length > 0 && (
                              <span className="text-[10px] font-bold text-blue-700 bg-blue-100/70 px-2 py-0.5 rounded-full flex items-center gap-1">
                                <ExternalLink className="w-2.5 h-2.5" />
                                {extractInlineLinks(block.content).length} lien(s) actif(s)
                              </span>
                            )}
                          </div>

                          {/* Zone de saisie avec écoute de la sélection du texte */}
                          <textarea 
                            rows={3} 
                            value={block.content} 
                            onSelect={(e) => handleTextSelect(block.id, e)}
                            onKeyUp={(e) => handleTextSelect(block.id, e)}
                            onMouseUp={(e) => handleTextSelect(block.id, e)}
                            onChange={(e) => updateBlockContent(block.id, e.target.value)}
                            style={{
                              textAlign: block.styles?.align || 'left',
                              color: block.styles?.textColor || '#334155'
                            }}
                            placeholder="Écrivez votre paragraphe... Vous pouvez surligner n'importe quel morceau pour le rendre cliquable."
                            className="w-full text-xs bg-[#FBF9F5]/50 border border-slate-200 rounded-xl p-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500 font-sans leading-relaxed"
                          />

                          {/* Aperçu en direct du texte avec les liens cliquables réels */}
                          <div className="bg-slate-50/70 p-2.5 rounded-xl border border-slate-200/80">
                            <div className="flex items-center justify-between text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1">
                              <span>Rendu en direct</span>
                              <span className="text-blue-600 font-bold normal-case">Liens cliquables actifs</span>
                            </div>
                            <div 
                              className="text-xs text-slate-700 leading-relaxed font-sans"
                              dangerouslySetInnerHTML={{ __html: formatInlineLinks(block.content, '#2563EB') }}
                            />
                          </div>

                        </div>
                      )}

                      {/* BLOC : IMAGE */}
                      {block.type === 'image' && (
                        <div className="space-y-2">
                          <input 
                            type="text" 
                            value={block.content} 
                            onChange={(e) => updateBlockContent(block.id, e.target.value)}
                            placeholder="URL de l'image (https://...)"
                            className="w-full text-xs font-mono text-slate-600 bg-slate-50 border border-slate-200 rounded-xl p-2 focus:outline-none"
                          />
                          {block.content && (
                            <div className="h-32 bg-slate-100 rounded-xl overflow-hidden flex items-center justify-center border border-slate-200">
                              <img 
                                src={block.content} 
                                alt="Aperçu visuel" 
                                className="max-h-full object-cover rounded-lg" 
                                onError={(e) => { (e.target as HTMLElement).style.display = 'none'; }} 
                              />
                            </div>
                          )}
                        </div>
                      )}

                      {/* BLOC : BOUTON CTA */}
                      {block.type === 'button' && (
                        <div className="space-y-2 pt-1">
                          <div className="grid grid-cols-2 gap-2">
                            <input 
                              type="text" 
                              value={block.content} 
                              onChange={(e) => updateBlockContent(block.id, e.target.value)}
                              placeholder="Texte du bouton"
                              className="text-xs font-bold text-slate-800 bg-slate-50 border border-slate-200 rounded-xl p-2 focus:outline-none"
                            />
                            <input 
                              type="text" 
                              value={block.url || ''} 
                              onChange={(e) => updateBlockUrl(block.id, e.target.value)}
                              placeholder="Lien URL (https://...)"
                              className="text-xs font-mono text-slate-600 bg-slate-50 border border-slate-200 rounded-xl p-2 focus:outline-none"
                            />
                          </div>
                          <div style={{ textAlign: block.styles?.align || 'center' }} className="py-1">
                            <span 
                              style={{ 
                                backgroundColor: block.styles?.backgroundColor || '#2563EB',
                                color: block.styles?.textColor || '#ffffff'
                              }}
                              className="inline-block px-6 py-2.5 text-xs font-black rounded-xl shadow-md cursor-pointer"
                            >
                              {block.content}
                            </span>
                          </div>
                        </div>
                      )}

                      {/* BLOC : FOOTER LÉGAL */}
                      {block.type === 'footer' && (
                        <div className="space-y-1.5">
                          <div className="flex items-center justify-between">
                            <button
                              type="button"
                              onClick={() => openInlineLinkModal(block.id)}
                              className="px-2 py-0.5 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 rounded-md text-[10px] font-bold flex items-center gap-1 transition cursor-pointer"
                            >
                              <Link className="w-2.5 h-2.5" /> Lier un morceau (ex: Se désabonner)
                            </button>
                            {extractInlineLinks(block.content).length > 0 && (
                              <span className="text-[10px] text-blue-600 font-bold">
                                {extractInlineLinks(block.content).length} lien(s)
                              </span>
                            )}
                          </div>
                          <textarea 
                            rows={2} 
                            value={block.content} 
                            onSelect={(e) => handleTextSelect(block.id, e)}
                            onKeyUp={(e) => handleTextSelect(block.id, e)}
                            onMouseUp={(e) => handleTextSelect(block.id, e)}
                            onChange={(e) => updateBlockContent(block.id, e.target.value)}
                            className="w-full text-[11px] text-slate-500 bg-slate-50 border border-slate-200 rounded-xl p-2 focus:outline-none leading-relaxed"
                          />
                          <div 
                            className="text-[10px] text-slate-400"
                            dangerouslySetInnerHTML={{ __html: formatInlineLinks(block.content, '#2563EB') }}
                          />
                        </div>
                      )}

                    </div>
                  );
                })
              ) : (
                <div className="relative">
                  <button
                    type="button"
                    onClick={copyHtmlToClipboard}
                    className="absolute right-3 top-3 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-md"
                  >
                    {copiedHtml ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedHtml ? 'Copié !' : 'Copier HTML'}</span>
                  </button>
                  <pre className="text-[11px] font-mono text-emerald-400 bg-slate-900 p-4 rounded-2xl overflow-x-auto max-h-[540px] leading-relaxed">
                    {generateHtmlOutput()}
                  </pre>
                </div>
              )}
            </div>

            <div className="bg-slate-900 text-slate-400 text-[10px] p-3 text-center font-medium">
              Propulsé par Nanasore Email Engine • Conforme RGPD & CAN-SPAM
            </div>
          </div>
        </div>

      </div>

      {/* =========================================================================
          MODALE 1 : TRANSFORMER UN MORCEAU DE TEXTE EN LIEN HYPERTEXTE
         ========================================================================= */}
      {inlineLinkModal && inlineLinkModal.isOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-md w-full overflow-hidden animate-in fade-in zoom-in-95">
            <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-blue-600 text-white flex items-center justify-center">
                  <Link className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-black">Insérer un lien dans le texte</h3>
                  <p className="text-[11px] text-slate-400">Rendre un mot ou une phrase cliquable</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setInlineLinkModal(null)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 cursor-pointer transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form 
              onSubmit={(e) => {
                e.preventDefault();
                applyInlineLink(
                  inlineLinkModal.blockId,
                  inlineLinkModal.selectedText,
                  inlineLinkModal.url,
                  inlineLinkModal.start,
                  inlineLinkModal.end
                );
              }}
              className="p-6 space-y-4"
            >
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Morceau de texte à rendre cliquable
                </label>
                <input 
                  type="text"
                  required
                  value={inlineLinkModal.selectedText}
                  onChange={(e) => setInlineLinkModal({ ...inlineLinkModal, selectedText: e.target.value })}
                  placeholder="Ex: tarifs exclusifs, découvrez notre offre..."
                  className="w-full px-3.5 py-2.5 bg-[#FBF9F5] border border-slate-300 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-blue-600 focus:outline-none"
                />
                <span className="text-[10px] text-slate-400 mt-1 block">
                  Ce texte apparaîtra souligné en bleu et redirigera l'utilisateur au clic.
                </span>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  URL de redirection (Destination)
                </label>
                <input 
                  type="text"
                  required
                  value={inlineLinkModal.url}
                  onChange={(e) => setInlineLinkModal({ ...inlineLinkModal, url: e.target.value })}
                  placeholder="https://maboutique.com/produit ou https://wa.me/22501..."
                  className="w-full px-3.5 py-2.5 bg-[#FBF9F5] border border-slate-300 rounded-xl text-xs font-mono text-slate-800 focus:ring-2 focus:ring-blue-600 focus:outline-none"
                />
              </div>

              {/* Raccourcis d'adresses utiles */}
              <div className="space-y-1 pt-1">
                <span className="text-[10px] font-bold text-slate-400 block uppercase tracking-wider">
                  Suggestions rapides :
                </span>
                <div className="flex flex-wrap gap-1">
                  {[
                    { label: 'Boutique', url: 'https://nanasore.com' },
                    { label: 'WhatsApp', url: 'https://wa.me/22507000000' },
                    { label: 'Désabonnement', url: 'https://nanasore.com/unsubscribe' }
                  ].map((s) => (
                    <button
                      key={s.label}
                      type="button"
                      onClick={() => setInlineLinkModal({ ...inlineLinkModal, url: s.url })}
                      className="px-2 py-0.5 bg-slate-100 hover:bg-blue-50 hover:text-blue-600 text-slate-600 rounded-md text-[10px] font-bold transition cursor-pointer"
                    >
                      {s.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setInlineLinkModal(null)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition cursor-pointer"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-black shadow-md shadow-blue-500/20 transition cursor-pointer"
                >
                  Appliquer le lien
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =========================================================================
          MODALE 2 : SIMULATEUR DE BOÎTE MAIL RÉELLE (INBOX PREVIEW)
         ========================================================================= */}
      {isInboxModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-2xl w-full overflow-hidden flex flex-col max-h-[90vh] animate-in fade-in zoom-in-95">
            
            {/* Header de la Boîte Mail */}
            <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-red-500 text-white flex items-center justify-center font-black text-sm">
                  M
                </div>
                <div>
                  <h3 className="text-sm font-black flex items-center gap-2">
                    Simulateur de Boîte Mail Réelle
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700">
                      Gmail / Outlook Client
                    </span>
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    Voici exactement ce que vos clients voient avant et après avoir cliqué sur votre e-mail.
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsInboxModalOpen(false)}
                className="text-slate-400 hover:text-white cursor-pointer p-1 rounded-lg hover:bg-slate-800 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Corps de la Simulation */}
            <div className="p-6 space-y-6 overflow-y-auto">
              
              {/* 1. VUE LISTE DE BOÎTE DE RÉCEPTION (INBOX LINE) */}
              <div className="space-y-2">
                <span className="text-[11px] font-black uppercase tracking-wider text-slate-400">
                  1. Rendu dans la liste des e-mails (Boîte de réception)
                </span>
                
                <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3.5 flex items-center justify-between gap-3 shadow-xs hover:bg-white transition cursor-default">
                  <div className="flex items-center gap-3 min-w-0">
                    <input type="checkbox" className="rounded border-slate-300 text-blue-600 pointer-events-none" />
                    <StarIcon className="w-4 h-4 text-amber-400 fill-amber-400 shrink-0" />
                    
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-black text-slate-900 text-xs truncate max-w-[140px]">
                          {senderName}
                        </span>
                        <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-blue-100 text-blue-700">
                          Nouveau
                        </span>
                      </div>
                      
                      <div className="text-xs truncate text-slate-700 mt-0.5">
                        <strong className="text-slate-900">{subject || '(Sans objet)'}</strong>
                        <span className="text-slate-400 font-normal ml-2">
                          — {preheaderText}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="text-[11px] font-bold text-slate-400 shrink-0">
                    10:42
                  </div>
                </div>
              </div>

              {/* 2. VUE MESSAGE OUVERT DANS LE CLIENT MAIL */}
              <div className="space-y-2">
                <span className="text-[11px] font-black uppercase tracking-wider text-slate-400">
                  2. Rendu de l'e-mail ouvert avec morceaux de texte cliquables
                </span>

                <div className="border border-slate-200 rounded-2xl overflow-hidden bg-white shadow-xs">
                  <div className="bg-[#FBF9F5] border-b border-slate-200 px-4 py-3 flex items-center justify-between text-xs">
                    <div>
                      <h4 className="font-black text-slate-900 text-sm">{subject || '(Sans objet)'}</h4>
                      <div className="flex items-center gap-2 text-slate-500 text-[11px] mt-0.5">
                        <span>De : <strong>{senderName}</strong> &lt;{senderEmail}&gt;</span>
                        <span>•</span>
                        <span>Répondre à : {senderEmail}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 text-slate-400">
                      <Reply className="w-4 h-4" />
                      <MoreVertical className="w-4 h-4" />
                    </div>
                  </div>

                  <div 
                    className="p-6 max-h-[380px] overflow-y-auto transition-colors"
                    style={{ backgroundColor: emailBgColor }}
                  >
                    <div 
                      className="max-w-md mx-auto p-5 rounded-2xl border border-slate-200 shadow-sm space-y-3"
                      style={{ backgroundColor: cardBgColor }}
                    >
                      {blocks.map((b) => (
                        <div key={b.id} style={{ textAlign: b.styles?.align || 'left' }}>
                          {b.type === 'banner' && (
                            <div 
                              style={{
                                borderRadius: b.bannerConfig?.borderRadius === 'sharp' ? '0px' : '12px',
                                background: b.bannerConfig?.gradientPreset === 'image' && b.bannerConfig?.imageUrl
                                  ? `linear-gradient(rgba(15, 23, 42, 0.7), rgba(15, 23, 42, 0.7)), url('${b.bannerConfig.imageUrl}') center/cover`
                                  : (BANNER_PRESETS[b.bannerConfig?.gradientPreset || 'royal']?.gradient || BANNER_PRESETS.royal.gradient),
                                color: BANNER_PRESETS[b.bannerConfig?.gradientPreset || 'royal']?.textColor || '#ffffff',
                                padding: b.bannerConfig?.height === 'compact' ? '12px 14px' : '18px 16px'
                              }}
                              className="text-center shadow-xs mb-2"
                            >
                              {b.bannerConfig?.badgeText && (
                                <span className="inline-block text-[8px] font-black uppercase bg-white/20 px-2 py-0.5 rounded-full mb-1">
                                  {b.bannerConfig.badgeText}
                                </span>
                              )}
                              <h4 className="font-black text-xs">{b.content}</h4>
                              {b.bannerConfig?.subtitle && (
                                <p className="text-[10px] opacity-90 mt-0.5">{b.bannerConfig.subtitle}</p>
                              )}
                            </div>
                          )}
                          {b.type === 'logo' && (
                            <img src={b.content} alt="Logo" style={{ maxWidth: `${b.logoWidth || 140}px` }} className="inline-block" />
                          )}
                          {b.type === 'badge' && (
                            <span className="inline-block text-[10px] font-extrabold px-3 py-1 bg-blue-50 text-blue-700 rounded-full">
                              {b.content}
                            </span>
                          )}
                          {b.type === 'heading' && (
                            <h2 
                              style={{ color: b.styles?.textColor || '#2563EB' }} 
                              className="font-black text-base"
                              dangerouslySetInnerHTML={{ __html: formatInlineLinks(b.content, b.styles?.textColor || '#2563EB') }}
                            />
                          )}
                          {b.type === 'text' && (
                            <p 
                              className="text-xs text-slate-700 leading-relaxed font-sans"
                              dangerouslySetInnerHTML={{ __html: formatInlineLinks(b.content, '#2563EB') }}
                            />
                          )}
                          {b.type === 'image' && (
                            <img src={b.content} alt="Visuel" className="rounded-xl max-h-36 mx-auto object-cover" />
                          )}
                          {b.type === 'button' && (
                            <div className="py-2">
                              <span style={{ backgroundColor: b.styles?.backgroundColor || '#2563EB' }} className="inline-block px-5 py-2 text-white font-bold text-xs rounded-xl shadow">
                                {b.content}
                              </span>
                            </div>
                          )}
                          {b.type === 'footer' && (
                            <p 
                              className="text-[10px] text-slate-400 pt-3 border-t border-slate-100"
                              dangerouslySetInnerHTML={{ __html: formatInlineLinks(b.content, '#2563EB') }}
                            />
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

            </div>

            {/* Footer Modal */}
            <div className="bg-[#FBF9F5] border-t border-slate-200 px-6 py-3 flex items-center justify-between">
              <span className="text-xs text-slate-500 font-medium flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                Score anti-spam : <strong>10/10 Excellent</strong> (Hébergé sur Brevo SMTP Pro)
              </span>

              <button
                type="button"
                onClick={() => setIsInboxModalOpen(false)}
                className="px-5 py-2 bg-blue-600 text-white rounded-xl text-xs font-black shadow-xs hover:bg-blue-700 cursor-pointer"
              >
                Fermer l'aperçu
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
