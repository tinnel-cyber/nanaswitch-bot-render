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
  Info
} from 'lucide-react';

export interface EmailBlock {
  id: string;
  type: 'heading' | 'text' | 'button' | 'image' | 'footer' | 'divider' | 'badge' | 'testimonial';
  content: string;
  url?: string;
  styles?: {
    align?: 'left' | 'center' | 'right';
    textColor?: string;
    backgroundColor?: string;
    fontSize?: 'sm' | 'md' | 'lg' | 'xl';
    isBold?: boolean;
    isItalic?: boolean;
  };
}

export interface EmailBuilderStudioProps {
  onTemplateSave: (htmlContent: string, subject: string, senderName?: string) => void;
  initialSubject?: string;
  initialSenderName?: string;
}

export function EmailBuilderStudio({
  onTemplateSave,
  initialSubject = '🔥 Offre exclusive de la semaine !',
  initialSenderName = 'Ma Boutique Pro'
}: EmailBuilderStudioProps) {
  const [subject, setSubject] = useState<string>(initialSubject);
  const [senderName, setSenderName] = useState<string>(initialSenderName);
  const [previewMode, setPreviewMode] = useState<'desktop' | 'mobile'>('desktop');
  const [activeTab, setActiveTab] = useState<'visual' | 'code'>('visual');
  const [copiedVar, setCopiedVar] = useState<string | null>(null);
  const [selectedBlockId, setSelectedBlockId] = useState<string | null>('1');
  const [copiedHtml, setCopiedHtml] = useState(false);

  // Palette de couleurs pour entreprise
  const colorPresets = [
    { label: 'Bleu Royal Nanasore', value: '#2563EB' },
    { label: 'Bleu Foncé', value: '#1D4ED8' },
    { label: 'Ardoise Sombre', value: '#1E293B' },
    { label: 'Émeraude Succès', value: '#10B981' },
    { label: 'Ambre Promotion', value: '#F59E0B' },
    { label: 'Corail / Rouge Urgent', value: '#EF4444' }
  ];

  // Blocs dynamiques enrichis (Titre, Texte, Image, Bouton, Badge, Footer...)
  const [blocks, setBlocks] = useState<EmailBlock[]>([
    { 
      id: '1', 
      type: 'badge', 
      content: '⚡ OFFRE FLASH LIMITÉE • -30% CE WEEK-END', 
      styles: { align: 'center', textColor: '#2563EB', backgroundColor: '#EFF6FF' } 
    },
    { 
      id: '2', 
      type: 'heading', 
      content: '🔥 Offre exclusive réservée à nos meilleurs clients !', 
      styles: { align: 'center', textColor: '#2563EB', fontSize: 'xl', isBold: true } 
    },
    { 
      id: '3', 
      type: 'text', 
      content: 'Bonjour {{FIRSTNAME}}, nous sommes ravis de vous compter parmi les clients privilégiés de {{SHOP_NAME}}. Pour célébrer notre nouvelle collection, profitez dès maintenant de nos tarifs exclusifs avec le code promo {{PROMO_CODE}}.', 
      styles: { align: 'left', textColor: '#334155', fontSize: 'md' } 
    },
    { 
      id: '4', 
      type: 'image', 
      content: 'https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?q=80&w=800&auto=format&fit=crop', 
      styles: { align: 'center' } 
    },
    { 
      id: '5', 
      type: 'button', 
      content: 'Découvrir la Collection en 1-Clic', 
      url: 'https://nanasore.com', 
      styles: { align: 'center', backgroundColor: '#2563EB', textColor: '#ffffff' } 
    },
    { 
      id: '6', 
      type: 'testimonial', 
      content: '« Service ultra rapide et produits conformes. Je recommande vivement pour tous mes achats en Afrique de l\'Ouest ! » — Aïcha K., cliente vérifiée', 
      styles: { align: 'center', textColor: '#475569', backgroundColor: '#F8FAFC' } 
    },
    { 
      id: '7', 
      type: 'footer', 
      content: 'Vous recevez cet e-mail suite à votre inscription sur {{SHOP_NAME}}. Conformité RGPD & directives anti-spam internationales. Pour ne plus recevoir nos offres, cliquez sur Se désabonner.' 
    }
  ]);

  const addBlock = (type: EmailBlock['type']) => {
    let defaultContent = 'Nouveau texte informatif...';
    let defaultStyles: EmailBlock['styles'] = { align: 'center', textColor: '#1e293b' };

    if (type === 'heading') {
      defaultContent = 'Nouveau titre accrocheur 🚀';
      defaultStyles = { align: 'center', textColor: '#2563EB', fontSize: 'xl', isBold: true };
    } else if (type === 'badge') {
      defaultContent = '🔥 NOUVELLE COLLECTION DISPONIBLE';
      defaultStyles = { align: 'center', textColor: '#2563EB', backgroundColor: '#EFF6FF' };
    } else if (type === 'image') {
      defaultContent = 'https://images.unsplash.com/photo-1557804506-669a67965ba0?q=80&w=800&auto=format&fit=crop';
    } else if (type === 'button') {
      defaultContent = 'Profiter de l\'offre maintenant';
      defaultStyles = { align: 'center', backgroundColor: '#2563EB', textColor: '#ffffff' };
    } else if (type === 'testimonial') {
      defaultContent = '« Une expérience client exceptionnelle avec un suivi WhatsApp irréprochable ! »';
      defaultStyles = { align: 'center', textColor: '#475569', backgroundColor: '#F8FAFC' };
    } else if (type === 'footer') {
      defaultContent = '© 2026 {{SHOP_NAME}}. Tous droits réservés. Se désabonner.';
      defaultStyles = { align: 'center', textColor: '#64748b', fontSize: 'sm' };
    }

    const newId = Date.now().toString();
    const newBlock: EmailBlock = {
      id: newId,
      type,
      content: defaultContent,
      styles: defaultStyles,
      url: type === 'button' ? 'https://nanasore.com' : undefined
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

  const updateBlockContent = (id: string, content: string) => {
    setBlocks(prev => prev.map(b => b.id === id ? { ...b, content } : b));
  };

  const updateBlockUrl = (id: string, url: string) => {
    setBlocks(prev => prev.map(b => b.id === id ? { ...b, url } : b));
  };

  const updateBlockStyles = (id: string, styleUpdates: Partial<NonNullable<EmailBlock['styles']>>) => {
    setBlocks(prev => prev.map(b => b.id === id ? {
      ...b,
      styles: { ...b.styles, ...styleUpdates }
    } : b));
  };

  const insertVariable = (variable: string) => {
    navigator.clipboard.writeText(variable);
    setCopiedVar(variable);
    setTimeout(() => setCopiedVar(null), 2000);

    // Si un bloc est sélectionné, on l'injecte directement
    if (selectedBlockId) {
      const activeBlock = blocks.find(b => b.id === selectedBlockId);
      if (activeBlock && (activeBlock.type === 'text' || activeBlock.type === 'heading' || activeBlock.type === 'button')) {
        updateBlockContent(selectedBlockId, activeBlock.content + ' ' + variable);
      }
    }
  };

  const insertEmoji = (emoji: string) => {
    const targetId = selectedBlockId || blocks.find(b => b.type === 'text' || b.type === 'heading')?.id;
    if (targetId) {
      const target = blocks.find(b => b.id === targetId);
      if (target) {
        updateBlockContent(targetId, target.content + ' ' + emoji);
      }
    }
  };

  // Génération du code HTML brut professionnel, responsive et compatible Brevo / Gmail / Outlook
  const generateHtmlOutput = () => {
    return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${subject || 'Campagne E-mailing'}</title>
  <!--[if mso]>
  <style type="text/css">
    body, table, td {font-family: Arial, Helvetica, sans-serif !important;}
  </style>
  <![endif]-->
</head>
<body style="margin: 0; padding: 0; background-color: #FBF9F5; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #1e293b; -webkit-font-smoothing: antialiased;">
  <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #FBF9F5; padding: 30px 10px;">
    <tr>
      <td align="center">
        <!-- Conteneur Principal Carte Blanche -->
        <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 600px; background-color: #ffffff; border-radius: 20px; border: 1px solid #e2e8f0; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.03);">
          
          <!-- En-tête Branded -->
          <tr>
            <td style="padding: 24px 32px; border-bottom: 1px solid #f1f5f9; background: #ffffff;">
              <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%">
                <tr>
                  <td align="left">
                    <span style="font-size: 14px; font-weight: 800; color: #2563EB; letter-spacing: -0.2px;">${senderName || 'Ma Boutique'}</span>
                  </td>
                  <td align="right">
                    <span style="font-size: 11px; font-weight: 600; color: #94a3b8; text-transform: uppercase;">Édition Spéciale</span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Corps de l'E-mail -->
          <tr>
            <td style="padding: 32px 32px 24px 32px;">
              ${blocks.map(b => {
                const align = b.styles?.align || 'left';
                const color = b.styles?.textColor || '#1e293b';

                if (b.type === 'badge') {
                  return `
                    <div style="text-align: ${align}; margin-bottom: 18px;">
                      <span style="display: inline-block; background-color: ${b.styles?.backgroundColor || '#EFF6FF'}; color: ${color}; font-size: 11px; font-weight: 800; padding: 6px 14px; border-radius: 50px; text-transform: uppercase; letter-spacing: 0.5px; border: 1px solid #DBEAFE;">
                        ${b.content}
                      </span>
                    </div>`;
                }

                if (b.type === 'heading') {
                  const fontSize = b.styles?.fontSize === 'xl' ? '24px' : b.styles?.fontSize === 'lg' ? '20px' : '18px';
                  return `
                    <h2 style="color: ${color}; text-align: ${align}; font-size: ${fontSize}; font-weight: 800; line-height: 1.3; margin: 0 0 18px 0; letter-spacing: -0.4px;">
                      ${b.content}
                    </h2>`;
                }

                if (b.type === 'text') {
                  return `
                    <p style="font-size: 15px; line-height: 1.65; text-align: ${align}; color: ${color}; margin: 0 0 18px 0;">
                      ${b.content}
                    </p>`;
                }

                if (b.type === 'image') {
                  return `
                    <div style="text-align: ${align}; margin: 24px 0;">
                      <img src="${b.content}" alt="Visuel Campagne" style="max-width: 100%; height: auto; border-radius: 12px; display: block; margin: 0 auto; border: 1px solid #e2e8f0;" />
                    </div>`;
                }

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

                if (b.type === 'testimonial') {
                  return `
                    <div style="background-color: ${b.styles?.backgroundColor || '#F8FAFC'}; border-left: 4px solid #2563EB; padding: 16px 20px; border-radius: 0 12px 12px 0; margin: 24px 0; text-align: ${align};">
                      <p style="font-size: 13px; font-style: italic; color: ${color}; line-height: 1.6; margin: 0;">
                        ${b.content}
                      </p>
                    </div>`;
                }

                if (b.type === 'divider') {
                  return `<hr style="border: none; border-top: 1px solid #e2e8f0; margin: 28px 0;" />`;
                }

                if (b.type === 'footer') {
                  return `
                    <div style="border-top: 1px solid #f1f5f9; margin-top: 32px; padding-top: 20px; font-size: 11px; line-height: 1.6; color: #94a3b8; text-align: ${align};">
                      ${b.content}
                    </div>`;
                }

                return '';
              }).join('')}
            </td>
          </tr>

          <!-- Footer Entreprise Nanasore -->
          <tr>
            <td style="padding: 16px 32px 24px 32px; background-color: #fafaf9; border-top: 1px solid #f1f5f9; text-align: center;">
              <p style="margin: 0; font-size: 10px; color: #a8a29e; font-weight: 600;">
                Propulsé par Nanasore Email Engine • Conforme RGPD & Directives Anti-Spam Brevo
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

  return (
    <div className="bg-white rounded-3xl border border-slate-200/80 shadow-sm overflow-hidden flex flex-col lg:flex-row min-h-[780px]">
      
      {/* PANNEAU GAUCHE : OUTILS, RICH TEXT, EMOJIS & BLOCS (5 COLS) */}
      <div className="w-full lg:w-5/12 p-6 border-r border-slate-200 space-y-6 bg-[#FBF9F5] overflow-y-auto max-h-[850px]">
        
        {/* Titre & Sous-titre */}
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-blue-600 animate-pulse" />
            <span className="text-[10px] font-black uppercase tracking-wider bg-blue-100 text-blue-700 px-2.5 py-0.5 rounded-full">
              Éditeur Pro v3.0
            </span>
          </div>
          <h2 className="text-lg font-black text-slate-900 tracking-tight flex items-center gap-2">
            <Layout className="w-5 h-5 text-blue-600" /> Studio Éditeur Pro & Blocs
          </h2>
          <p className="text-xs text-slate-500">
            Personnalisez vos visuels, variables dynamiques et structure d'e-mail responsive.
          </p>
        </div>

        {/* Paramètres de l'e-mail (Expéditeur & Objet) */}
        <div className="space-y-3 bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between">
            <h3 className="text-[11px] font-black uppercase tracking-wider text-slate-400">
              Paramètres de l'e-mail
            </h3>
            <span className="text-[10px] font-bold text-emerald-600 flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5" /> DKIM Vérifié
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

        {/* Bibliothèque de Blocs Modulaires */}
        <div className="space-y-3 bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
          <h3 className="text-[11px] font-black uppercase tracking-wider text-slate-400">
            Ajouter un bloc modulaire
          </h3>
          <div className="grid grid-cols-2 gap-2">
            <button 
              type="button"
              onClick={() => addBlock('heading')} 
              className="p-2.5 bg-[#FBF9F5] hover:bg-blue-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 flex items-center gap-2 transition-all cursor-pointer hover:border-blue-300"
            >
              <Type className="w-4 h-4 text-blue-600" /> Titre H2
            </button>
            <button 
              type="button"
              onClick={() => addBlock('text')} 
              className="p-2.5 bg-[#FBF9F5] hover:bg-blue-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 flex items-center gap-2 transition-all cursor-pointer hover:border-blue-300"
            >
              <FileText className="w-4 h-4 text-blue-600" /> Paragraphe
            </button>
            <button 
              type="button"
              onClick={() => addBlock('image')} 
              className="p-2.5 bg-[#FBF9F5] hover:bg-blue-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 flex items-center gap-2 transition-all cursor-pointer hover:border-blue-300"
            >
              <ImageIcon className="w-4 h-4 text-blue-600" /> Image URL
            </button>
            <button 
              type="button"
              onClick={() => addBlock('button')} 
              className="p-2.5 bg-[#FBF9F5] hover:bg-blue-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 flex items-center gap-2 transition-all cursor-pointer hover:border-blue-300"
            >
              <Sparkles className="w-4 h-4 text-blue-600" /> Bouton CTA
            </button>
            <button 
              type="button"
              onClick={() => addBlock('badge')} 
              className="p-2.5 bg-[#FBF9F5] hover:bg-blue-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 flex items-center gap-2 transition-all cursor-pointer hover:border-blue-300"
            >
              <Tag className="w-4 h-4 text-blue-600" /> Badge Promo
            </button>
            <button 
              type="button"
              onClick={() => addBlock('testimonial')} 
              className="p-2.5 bg-[#FBF9F5] hover:bg-blue-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 flex items-center gap-2 transition-all cursor-pointer hover:border-blue-300"
            >
              <Star className="w-4 h-4 text-blue-600" /> Avis Client
            </button>
            <button 
              type="button"
              onClick={() => addBlock('footer')} 
              className="col-span-2 p-2.5 bg-[#FBF9F5] hover:bg-blue-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 flex items-center justify-center gap-2 transition-all cursor-pointer hover:border-blue-300"
            >
              <Layout className="w-4 h-4 text-blue-600" /> Footer Légal & Désabonnement
            </button>
          </div>
        </div>

        {/* Barre de Personnalisation / Rich Text & Palette pour le bloc actif */}
        {selectedBlock && (
          <div className="space-y-3 bg-white p-4 rounded-2xl border-2 border-blue-600/30 shadow-xs animate-in fade-in">
            <div className="flex items-center justify-between">
              <h3 className="text-[11px] font-black uppercase tracking-wider text-blue-700 flex items-center gap-1.5">
                <Palette className="w-3.5 h-3.5" /> Personnaliser le bloc ({selectedBlock.type})
              </h3>
              <span className="text-[10px] text-slate-400 font-bold">Actif</span>
            </div>

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

            {/* Sélecteur de Couleurs Préétablies */}
            <div>
              <label className="block text-[11px] font-bold text-slate-600 mb-1.5">Couleur Principale</label>
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

        {/* Bouton de sauvegarde */}
        <button
          type="button"
          onClick={() => onTemplateSave(generateHtmlOutput(), subject, senderName)}
          className="w-full py-4 bg-blue-600 hover:bg-blue-700 text-white font-black text-sm rounded-xl shadow-lg shadow-blue-500/25 transition-all flex items-center justify-center gap-2 cursor-pointer hover:-translate-y-0.5 active:translate-y-0"
        >
          <Send className="w-4 h-4" />
          Enregistrer le modèle & Passer à la diffusion
        </button>
      </div>

      {/* PANNEAU DROITE : PREVIEW EN HAUT & BLOCS ÉDITABLES (7 COLS) */}
      <div className="w-full lg:w-7/12 bg-slate-100 p-6 flex flex-col justify-between">
        
        {/* BARRE DE PRÉVISUALISATION SUPÉRIEURE INTERACTIVE */}
        <div className="flex flex-wrap items-center justify-between gap-3 bg-white px-4 py-3 rounded-2xl border border-slate-200 mb-4 shadow-xs">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-xs font-bold text-slate-800">Aperçu & Rendu en Temps Réel</span>
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
              <span>Édition Visuelle</span>
            </button>
            <button 
              type="button"
              onClick={() => setActiveTab('code')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                activeTab === 'code' ? 'bg-blue-600 text-white shadow-xs' : 'text-slate-600 bg-slate-100 hover:bg-slate-200'
              }`}
            >
              <Code className="w-3.5 h-3.5" />
              <span>Code HTML Brut</span>
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

        {/* CONTAINER DE L'ÉDITEUR / PRÉVISUALISEUR */}
        <div className="flex-1 flex items-center justify-center overflow-auto py-2">
          <div className={`bg-[#FBF9F5] border border-slate-300 shadow-2xl rounded-2xl overflow-hidden transition-all duration-300 flex flex-col ${
            previewMode === 'mobile' ? 'w-[375px] min-h-[620px]' : 'w-full max-w-xl min-h-[620px]'
          }`}>
            
            {/* Header de simulateur de boîte mail */}
            <div className="bg-white border-b border-slate-200 px-4 py-3 flex items-center justify-between text-xs font-semibold text-slate-500">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-[10px] font-black">
                  {senderName.charAt(0).toUpperCase()}
                </div>
                <span>De : <strong className="text-slate-900">{senderName}</strong></span>
              </div>
              <span className="truncate max-w-[200px] text-slate-600 font-medium">
                Objet : {subject || '(Sans objet)'}
              </span>
            </div>

            {/* Contenu visuel des blocs ou code HTML */}
            <div className="p-5 space-y-3.5 flex-1 overflow-y-auto max-h-[600px]">
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
                      {/* Actions rapides sur le bloc (Monter, Descendre, Supprimer) */}
                      <div className="absolute right-3 top-3 flex items-center gap-1 opacity-70 group-hover:opacity-100 transition-opacity">
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

                      <div className="text-[10px] uppercase font-black text-slate-400 tracking-wider">
                        Bloc • {block.type}
                      </div>

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

                      {/* BLOC : TITRE H2 */}
                      {block.type === 'heading' && (
                        <input 
                          type="text" 
                          value={block.content} 
                          onChange={(e) => updateBlockContent(block.id, e.target.value)}
                          style={{
                            textAlign: block.styles?.align || 'center',
                            color: block.styles?.textColor || '#2563EB'
                          }}
                          className="w-full font-black text-base bg-transparent border-b border-dashed border-slate-300 focus:outline-none focus:border-blue-600"
                        />
                      )}

                      {/* BLOC : TEXTE / PARAGRAPHE */}
                      {block.type === 'text' && (
                        <textarea 
                          rows={3} 
                          value={block.content} 
                          onChange={(e) => updateBlockContent(block.id, e.target.value)}
                          style={{
                            textAlign: block.styles?.align || 'left',
                            color: block.styles?.textColor || '#334155'
                          }}
                          className="w-full text-xs bg-[#FBF9F5]/50 border border-slate-200 rounded-xl p-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500 font-sans leading-relaxed"
                        />
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

                      {/* BLOC : TÉMOIGNAGE / AVIS */}
                      {block.type === 'testimonial' && (
                        <textarea 
                          rows={2} 
                          value={block.content} 
                          onChange={(e) => updateBlockContent(block.id, e.target.value)}
                          className="w-full text-xs italic text-slate-600 bg-slate-50 border border-slate-200 rounded-xl p-2.5 focus:outline-none"
                        />
                      )}

                      {/* BLOC : FOOTER LÉGAL */}
                      {block.type === 'footer' && (
                        <textarea 
                          rows={2} 
                          value={block.content} 
                          onChange={(e) => updateBlockContent(block.id, e.target.value)}
                          className="w-full text-[11px] text-slate-500 bg-slate-50 border border-slate-200 rounded-xl p-2 focus:outline-none leading-relaxed"
                        />
                      )}

                      {/* BLOC : SÉPARATEUR */}
                      {block.type === 'divider' && <hr className="border-slate-200 my-2" />}

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

            {/* Pied de page du simulateur */}
            <div className="bg-slate-900 text-slate-400 text-[10px] p-3 text-center font-medium">
              Propulsé par Nanasore Email Engine • Conforme RGPD & CAN-SPAM
            </div>
          </div>
        </div>

      </div>

    </div>
  );
}
