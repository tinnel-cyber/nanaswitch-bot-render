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
  Palette, 
  Copy, 
  Check, 
  Plus, 
  Trash2,
  HelpCircle,
  ArrowUp,
  ArrowDown,
  Link,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Eye,
  Send,
  Sliders,
  CheckCircle2,
  FileCode,
  Undo2
} from 'lucide-react';

export interface EmailBlock {
  id: string;
  type: 'heading' | 'text' | 'button' | 'image' | 'divider';
  content: string;
  buttonUrl?: string;
  styles?: {
    align?: 'left' | 'center' | 'right';
    backgroundColor?: string;
    textColor?: string;
    fontSize?: 'sm' | 'md' | 'lg' | 'xl';
  };
}

export interface EmailBuilderStudioProps {
  onTemplateSave: (htmlContent: string, subject: string, senderName: string) => void;
  initialSubject?: string;
  initialSenderName?: string;
}

export function EmailBuilderStudio({ 
  onTemplateSave,
  initialSubject = '',
  initialSenderName = 'Ma Boutique Nanasore'
}: EmailBuilderStudioProps) {
  const [subject, setSubject] = useState<string>(initialSubject);
  const [senderName, setSenderName] = useState<string>(initialSenderName);
  const [previewMode, setPreviewMode] = useState<'desktop' | 'mobile'>('desktop');
  const [activeTab, setActiveTab] = useState<'visual' | 'code'>('visual');
  const [copiedVar, setCopiedVar] = useState<string | null>(null);
  const [selectedBlockId, setSelectedBlockId] = useState<string | null>('1');
  const [isCopiedHtml, setIsCopiedHtml] = useState(false);

  // Blocs dynamiques de l'email
  const [blocks, setBlocks] = useState<EmailBlock[]>([
    { 
      id: '1', 
      type: 'heading', 
      content: 'Profitez de nos offres exclusives cette semaine !', 
      styles: { align: 'center', textColor: '#2563EB' } 
    },
    { 
      id: '2', 
      type: 'text', 
      content: 'Bonjour {{FIRSTNAME}}, découvrez notre nouvelle sélection de produits et formations conçues spécialement pour booster votre activité en Afrique de l\'Ouest.', 
      styles: { align: 'left', textColor: '#1e293b' } 
    },
    { 
      id: '3', 
      type: 'button', 
      content: 'Accéder à la boutique', 
      buttonUrl: 'https://nanasore.com',
      styles: { align: 'center', backgroundColor: '#2563EB', textColor: '#ffffff' } 
    },
    { 
      id: '4', 
      type: 'divider', 
      content: '' 
    },
    { 
      id: '5', 
      type: 'text', 
      content: 'Besoin d\'aide ? Répondez directement à cet e-mail ou écrivez à notre équipe support.', 
      styles: { align: 'center', textColor: '#64748b' } 
    }
  ]);

  const addBlock = (type: EmailBlock['type']) => {
    const id = Date.now().toString();
    let content = 'Nouveau contenu...';
    let styles: EmailBlock['styles'] = { align: 'center' };
    let buttonUrl = '';

    if (type === 'heading') {
      content = 'Nouveau titre percutant';
      styles = { align: 'center', textColor: '#2563EB' };
    } else if (type === 'text') {
      content = 'Saisissez votre message ici. Utilisez les variables comme {{FIRSTNAME}} pour personnaliser l\'expérience.';
      styles = { align: 'left', textColor: '#334155' };
    } else if (type === 'button') {
      content = 'Découvrir nos offres';
      buttonUrl = 'https://';
      styles = { align: 'center', backgroundColor: '#2563EB', textColor: '#ffffff' };
    } else if (type === 'image') {
      content = 'https://images.unsplash.com/photo-1556742049-0a67c5574f73?w=800&auto=format&fit=crop&q=80';
      styles = { align: 'center' };
    }

    const newBlock: EmailBlock = { id, type, content, buttonUrl, styles };
    setBlocks(prev => [...prev, newBlock]);
    setSelectedBlockId(id);
  };

  const removeBlock = (id: string) => {
    setBlocks(prev => prev.filter(b => b.id !== id));
    if (selectedBlockId === id) setSelectedBlockId(null);
  };

  const moveBlock = (index: number, direction: 'up' | 'down') => {
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= blocks.length) return;
    const newBlocks = [...blocks];
    const [moved] = newBlocks.splice(index, 1);
    newBlocks.splice(targetIndex, 0, moved);
    setBlocks(newBlocks);
  };

  const updateBlockContent = (id: string, content: string) => {
    setBlocks(prev => prev.map(b => b.id === id ? { ...b, content } : b));
  };

  const updateBlockStyles = (id: string, updates: Partial<EmailBlock['styles']>) => {
    setBlocks(prev => prev.map(b => b.id === id ? { ...b, styles: { ...b.styles, ...updates } } : b));
  };

  const updateBlockButtonUrl = (id: string, buttonUrl: string) => {
    setBlocks(prev => prev.map(b => b.id === id ? { ...b, buttonUrl } : b));
  };

  const insertVariable = (variable: string) => {
    navigator.clipboard.writeText(variable);
    setCopiedVar(variable);
    setTimeout(() => setCopiedVar(null), 2000);
  };

  // Génération du HTML responsive de classe mondiale pour Brevo API
  const generateHtmlOutput = () => {
    return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${subject || 'Newsletter Nanasore'}</title>
  <!--[if mso]>
  <noscript>
    <xml>
      <o:OfficeDocumentSettings>
        <o:PixelsPerInch>96</o:PixelsPerInch>
      </o:OfficeDocumentSettings>
    </xml>
  </noscript>
  <![endif]-->
</head>
<body style="margin: 0; padding: 0; background-color: #FBF9F5; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #1e293b;">
  <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #FBF9F5; padding: 32px 12px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" style="max-width: 600px; background-color: #ffffff; border-radius: 20px; border: 1px solid #e2e8f0; box-shadow: 0 4px 16px rgba(0, 0, 0, 0.04); overflow: hidden;">
          <!-- En-tête de marque -->
          <tr>
            <td style="padding: 28px 32px 16px 32px; border-bottom: 1px solid #f1f5f9; text-align: center;">
              <span style="font-size: 20px; font-weight: 900; letter-spacing: -0.5px; color: #1D4ED8;">${senderName}</span>
            </td>
          </tr>
          <!-- Corps de l'email -->
          <tr>
            <td style="padding: 32px 32px;">
              ${blocks.map(b => {
                const align = b.styles?.align || 'left';
                if (b.type === 'heading') {
                  const color = b.styles?.textColor || '#2563EB';
                  return `<h2 style="font-size: 22px; font-weight: 800; color: ${color}; text-align: ${align}; margin: 16px 0 12px 0; line-height: 1.35;">${b.content}</h2>`;
                }
                if (b.type === 'text') {
                  const color = b.styles?.textColor || '#334155';
                  return `<p style="font-size: 15px; line-height: 1.65; color: ${color}; text-align: ${align}; margin: 12px 0;">${b.content.replace(/\n/g, '<br/>')}</p>`;
                }
                if (b.type === 'button') {
                  const bg = b.styles?.backgroundColor || '#2563EB';
                  const textCol = b.styles?.textColor || '#ffffff';
                  return `<table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" style="margin: 24px 0;">
                    <tr>
                      <td align="${align}">
                        <a href="${b.buttonUrl || '#'}" target="_blank" style="display: inline-block; background-color: ${bg}; color: ${textCol}; font-size: 14px; font-weight: 800; text-decoration: none; padding: 14px 28px; border-radius: 12px; box-shadow: 0 4px 10px rgba(37, 99, 235, 0.25); text-align: center;">${b.content}</a>
                      </td>
                    </tr>
                  </table>`;
                }
                if (b.type === 'image') {
                  return `<div style="text-align: ${align}; margin: 20px 0;">
                    <img src="${b.content}" alt="Image de campagne" style="max-width: 100%; border-radius: 12px; display: inline-block; border: 1px solid #e2e8f0;" />
                  </div>`;
                }
                return `<hr style="border: none; border-top: 1px solid #e2e8f0; margin: 24px 0;" />`;
              }).join('\n')}
            </td>
          </tr>
          <!-- Pied de page officiel -->
          <tr>
            <td style="padding: 24px 32px; background-color: #FBF9F5; border-top: 1px solid #f1f5f9; text-align: center; font-size: 11px; color: #94a3b8; line-height: 1.6;">
              <p style="margin: 0 0 6px 0; font-weight: 600; color: #64748b;">E-mail envoyé via ${senderName} sur Nanasore.</p>
              <p style="margin: 0;">Vous recevez cet e-mail car vous êtes client enregistré. <a href="{{UNSUBSCRIBE_LINK}}" style="color: #2563EB; text-decoration: underline;">Se désabonner</a></p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
  };

  const copyHtml = () => {
    navigator.clipboard.writeText(generateHtmlOutput());
    setIsCopiedHtml(true);
    setTimeout(() => setIsCopiedHtml(false), 2000);
  };

  const selectedBlock = blocks.find(b => b.id === selectedBlockId);

  return (
    <div className="bg-white rounded-3xl border border-slate-200/80 shadow-sm overflow-hidden flex flex-col lg:flex-row min-h-[720px] transition-all">
      
      {/* ========================================================================= */}
      {/* PANNEAU DE GAUCHE : OUTILS & GESTION DES BLOCS (5 COLS / 42%)             */}
      {/* ========================================================================= */}
      <div className="w-full lg:w-5/12 p-6 border-r border-slate-200 space-y-6 bg-[#FBF9F5] flex flex-col justify-between overflow-y-auto">
        <div className="space-y-6">
          {/* Header Title */}
          <div className="space-y-1">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 border border-blue-200/80 text-blue-700 text-[10px] font-black uppercase tracking-wider">
              <Sparkles className="w-3 h-3 text-blue-600" />
              Éditeur Visuel Tenant
            </div>
            <h2 className="text-xl font-black text-slate-900 flex items-center gap-2">
              <Layout className="w-5 h-5 text-blue-600" />
              <span>Studio de Composition</span>
            </h2>
            <p className="text-xs text-slate-500">
              Concevez des emails professionnels aux couleurs de votre marque sans taper une ligne de code.
            </p>
          </div>

          {/* Configuration Expéditeur & Objet */}
          <div className="space-y-3 bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
            <h3 className="text-[11px] font-black uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
              <Sliders className="w-3.5 h-3.5 text-blue-600" />
              <span>En-tête de Campagne</span>
            </h3>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Nom affiché de l'expéditeur
              </label>
              <input 
                type="text" 
                value={senderName} 
                onChange={(e) => setSenderName(e.target.value)}
                placeholder="Ex: Boutique Amina & Co"
                className="w-full px-3.5 py-2 bg-[#FBF9F5] border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100 transition-all"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Objet de l'e-mail (Subject Line)
              </label>
              <input 
                type="text" 
                value={subject} 
                onChange={(e) => setSubject(e.target.value)}
                placeholder="Ex: ⚡ -20% sur toute la collection cette semaine !"
                className="w-full px-3.5 py-2 bg-[#FBF9F5] border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100 transition-all"
              />
            </div>
          </div>

          {/* Boîte à Outils d'Ajout de Blocs */}
          <div className="space-y-3 bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
            <h3 className="text-[11px] font-black uppercase tracking-wider text-slate-400">
              Insérer un nouveau bloc
            </h3>
            <div className="grid grid-cols-2 gap-2">
              <button 
                type="button"
                onClick={() => addBlock('heading')} 
                className="p-3 bg-[#FBF9F5] hover:bg-blue-50/80 hover:border-blue-400 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 flex items-center gap-2 transition-all cursor-pointer group active:scale-95"
              >
                <div className="w-7 h-7 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center group-hover:bg-blue-600 group-hover:text-white transition-colors">
                  <Type className="w-4 h-4" />
                </div>
                <span>Titre H2</span>
              </button>

              <button 
                type="button"
                onClick={() => addBlock('text')} 
                className="p-3 bg-[#FBF9F5] hover:bg-blue-50/80 hover:border-blue-400 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 flex items-center gap-2 transition-all cursor-pointer group active:scale-95"
              >
                <div className="w-7 h-7 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center group-hover:bg-blue-600 group-hover:text-white transition-colors">
                  <Plus className="w-4 h-4" />
                </div>
                <span>Paragraphe</span>
              </button>

              <button 
                type="button"
                onClick={() => addBlock('button')} 
                className="p-3 bg-[#FBF9F5] hover:bg-blue-50/80 hover:border-blue-400 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 flex items-center gap-2 transition-all cursor-pointer group active:scale-95"
              >
                <div className="w-7 h-7 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center group-hover:bg-blue-600 group-hover:text-white transition-colors">
                  <Sparkles className="w-4 h-4" />
                </div>
                <span>Bouton CTA</span>
              </button>

              <button 
                type="button"
                onClick={() => addBlock('divider')} 
                className="p-3 bg-[#FBF9F5] hover:bg-blue-50/80 hover:border-blue-400 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 flex items-center gap-2 transition-all cursor-pointer group active:scale-95"
              >
                <div className="w-7 h-7 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center group-hover:bg-blue-600 group-hover:text-white transition-colors">
                  <Layout className="w-4 h-4" />
                </div>
                <span>Séparateur</span>
              </button>
            </div>
          </div>

          {/* Inspecteur de bloc actif */}
          {selectedBlock && (
            <div className="space-y-3 bg-white p-4 rounded-2xl border-2 border-blue-200 shadow-sm animate-fadeIn">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-black uppercase tracking-wider text-blue-700">
                  Édition du bloc : <strong className="uppercase">{selectedBlock.type}</strong>
                </span>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => updateBlockStyles(selectedBlock.id, { align: 'left' })}
                    className={`p-1.5 rounded-lg text-xs ${selectedBlock.styles?.align === 'left' ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600'}`}
                    title="Aligner à gauche"
                  >
                    <AlignLeft className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => updateBlockStyles(selectedBlock.id, { align: 'center' })}
                    className={`p-1.5 rounded-lg text-xs ${selectedBlock.styles?.align === 'center' ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600'}`}
                    title="Centrer"
                  >
                    <AlignCenter className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => updateBlockStyles(selectedBlock.id, { align: 'right' })}
                    className={`p-1.5 rounded-lg text-xs ${selectedBlock.styles?.align === 'right' ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600'}`}
                    title="Aligner à droite"
                  >
                    <AlignRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {selectedBlock.type === 'button' && (
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">
                    Lien de redirection (URL) :
                  </label>
                  <div className="relative">
                    <Link className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="url"
                      value={selectedBlock.buttonUrl || ''}
                      onChange={(e) => updateBlockButtonUrl(selectedBlock.id, e.target.value)}
                      placeholder="https://votre-boutique.com/produit"
                      className="w-full pl-8 pr-3 py-1.5 bg-[#FBF9F5] border border-slate-200 rounded-xl text-xs font-mono text-slate-800 focus:outline-none focus:border-blue-600"
                    />
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Variables Dynamiques Brevo Cliquables */}
          <div className="space-y-2 bg-blue-50/70 p-4 rounded-2xl border border-blue-200/80">
            <h3 className="text-xs font-extrabold uppercase tracking-wider text-blue-900 flex items-center gap-1.5">
              <HelpCircle className="w-3.5 h-3.5 text-blue-700" />
              <span>Variables Dynamiques Cliquables</span>
            </h3>
            <p className="text-[11px] text-blue-700 leading-relaxed">
              Cliquez pour copier la balise et collez-la dans vos titres ou textes :
            </p>
            <div className="flex flex-wrap gap-1.5 pt-1">
              {[
                { tag: '{{FIRSTNAME}}', desc: 'Prénom' },
                { tag: '{{LASTNAME}}', desc: 'Nom' },
                { tag: '{{SHOP_NAME}}', desc: 'Nom Boutique' },
                { tag: '{{PROMO_CODE}}', desc: 'Code Promo' }
              ].map(({ tag, desc }) => (
                <button
                  key={tag}
                  type="button"
                  onClick={() => insertVariable(tag)}
                  className="px-2.5 py-1 bg-white border border-blue-200 text-blue-700 font-mono text-[11px] font-bold rounded-lg shadow-2xs hover:bg-blue-600 hover:text-white transition-all flex items-center gap-1 cursor-pointer"
                  title={`Insérer ${desc}`}
                >
                  {copiedVar === tag ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                  <span>{tag}</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Bouton Enregistrer & Passer au Dispatch */}
        <div className="pt-6">
          <button
            type="button"
            onClick={() => onTemplateSave(generateHtmlOutput(), subject, senderName)}
            className="w-full py-3.5 bg-blue-600 hover:bg-blue-700 active:scale-98 text-white font-black text-sm rounded-xl shadow-lg shadow-blue-600/30 transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            <Send className="w-4 h-4" />
            <span>Enregistrer le modèle & Passer au ciblage</span>
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* PANNEAU DE DROITE : APERÇU EN TEMPS RÉEL (7 COLS / 58%)                   */}
      {/* ========================================================================= */}
      <div className="w-full lg:w-7/12 bg-slate-100/80 p-6 flex flex-col justify-between overflow-hidden">
        
        {/* Top Control Bar */}
        <div className="flex items-center justify-between bg-white px-4 py-2.5 rounded-2xl border border-slate-200 mb-6 shadow-sm">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
            <span className="text-xs font-bold text-slate-700">Rendu Visuel en Direct</span>
          </div>

          <div className="flex items-center gap-2">
            {/* Visual vs Code HTML View */}
            <div className="flex items-center bg-slate-100 p-1 rounded-xl">
              <button 
                type="button"
                onClick={() => setActiveTab('visual')}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                  activeTab === 'visual' 
                    ? 'bg-blue-600 text-white shadow-sm' 
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Visuel
              </button>
              <button 
                type="button"
                onClick={() => setActiveTab('code')}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                  activeTab === 'code' 
                    ? 'bg-blue-600 text-white shadow-sm' 
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Code HTML
              </button>
            </div>

            <div className="h-4 w-px bg-slate-200 mx-1"></div>

            {/* Device Switcher */}
            <div className="flex items-center bg-slate-100 p-1 rounded-xl">
              <button 
                type="button"
                onClick={() => setPreviewMode('desktop')} 
                className={`p-1.5 rounded-lg transition-all ${
                  previewMode === 'desktop' ? 'bg-white shadow-sm text-blue-600' : 'text-slate-400 hover:text-slate-700'
                }`}
                title="Aperçu Ordinateur (Desktop)"
              >
                <Monitor className="w-4 h-4" />
              </button>
              <button 
                type="button"
                onClick={() => setPreviewMode('mobile')} 
                className={`p-1.5 rounded-lg transition-all ${
                  previewMode === 'mobile' ? 'bg-white shadow-sm text-blue-600' : 'text-slate-400 hover:text-slate-700'
                }`}
                title="Aperçu Smartphone (Mobile)"
              >
                <Smartphone className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* CONTAINER DU TEMPLATE */}
        <div className="flex-1 flex items-center justify-center overflow-auto py-2">
          {activeTab === 'visual' ? (
            <div className={`bg-[#FBF9F5] border border-slate-300 shadow-2xl rounded-2xl overflow-hidden transition-all duration-300 flex flex-col ${
              previewMode === 'mobile' 
                ? 'w-[360px] min-h-[580px] max-h-[700px] border-4 border-slate-800 rounded-[32px] p-2 bg-slate-900' 
                : 'w-full max-w-xl min-h-[580px]'
            }`}>
              {/* Inner wrapper for mobile device simulation */}
              <div className={`bg-[#FBF9F5] h-full flex flex-col rounded-xl overflow-hidden ${previewMode === 'mobile' ? 'rounded-[24px]' : ''}`}>
                
                {/* Email Header Preview Bar */}
                <div className="bg-white border-b border-slate-200 px-5 py-3.5 flex flex-col gap-1 text-xs">
                  <div className="flex items-center justify-between text-slate-500 text-[11px]">
                    <span className="font-bold text-slate-800">De : <strong className="text-blue-700">{senderName}</strong></span>
                    <span className="text-[10px] text-slate-400">Via Brevo Relay</span>
                  </div>
                  <div className="font-extrabold text-slate-900 text-sm truncate">
                    {subject || '(Sans objet — définissez un titre)'}
                  </div>
                </div>

                {/* Blocs édités en direct */}
                <div className="p-6 space-y-3 flex-1 overflow-y-auto">
                  {blocks.map((block, index) => {
                    const isSelected = selectedBlockId === block.id;

                    return (
                      <div 
                        key={block.id} 
                        onClick={() => setSelectedBlockId(block.id)}
                        className={`relative group bg-white p-4 rounded-xl border transition-all cursor-pointer ${
                          isSelected 
                            ? 'border-blue-600 ring-2 ring-blue-100 shadow-md' 
                            : 'border-slate-200/90 hover:border-blue-300 shadow-2xs'
                        }`}
                      >
                        {/* Actions de bloc : monter, descendre, supprimer */}
                        <div className="absolute right-2 top-2 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1 bg-white/90 p-1 rounded-lg border border-slate-200 shadow-xs z-10">
                          <button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); moveBlock(index, 'up'); }}
                            disabled={index === 0}
                            className="p-1 text-slate-500 hover:text-blue-600 disabled:opacity-30"
                            title="Monter"
                          >
                            <ArrowUp className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); moveBlock(index, 'down'); }}
                            disabled={index === blocks.length - 1}
                            className="p-1 text-slate-500 hover:text-blue-600 disabled:opacity-30"
                            title="Descendre"
                          >
                            <ArrowDown className="w-3.5 h-3.5" />
                          </button>
                          <button 
                            type="button"
                            onClick={(e) => { e.stopPropagation(); removeBlock(block.id); }} 
                            className="p-1 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded"
                            title="Supprimer ce bloc"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>

                        {/* Rendu dynamique du bloc selon son type */}
                        {block.type === 'heading' && (
                          <input 
                            type="text" 
                            value={block.content} 
                            onChange={(e) => updateBlockContent(block.id, e.target.value)}
                            style={{ textAlign: block.styles?.align || 'left', color: block.styles?.textColor || '#2563EB' }}
                            className="w-full font-black text-xl bg-transparent border-b border-dashed border-slate-200 focus:border-blue-500 focus:outline-none py-1"
                          />
                        )}

                        {block.type === 'text' && (
                          <textarea 
                            rows={3} 
                            value={block.content} 
                            onChange={(e) => updateBlockContent(block.id, e.target.value)}
                            style={{ textAlign: block.styles?.align || 'left', color: block.styles?.textColor || '#334155' }}
                            className="w-full text-xs leading-relaxed bg-transparent border border-slate-100 rounded-lg p-2.5 focus:border-blue-500 focus:outline-none font-sans"
                          />
                        )}

                        {block.type === 'button' && (
                          <div style={{ textAlign: block.styles?.align || 'center' }} className="py-2">
                            <span 
                              style={{ backgroundColor: block.styles?.backgroundColor || '#2563EB', color: block.styles?.textColor || '#ffffff' }}
                              className="inline-block px-6 py-2.5 text-xs font-black rounded-xl shadow-md transition-transform active:scale-95"
                            >
                              {block.content}
                            </span>
                          </div>
                        )}

                        {block.type === 'image' && (
                          <div style={{ textAlign: block.styles?.align || 'center' }}>
                            <img 
                              src={block.content} 
                              alt="Aperçu bloc" 
                              className="max-h-48 rounded-xl mx-auto object-cover border border-slate-200" 
                            />
                          </div>
                        )}

                        {block.type === 'divider' && (
                          <hr className="border-t border-slate-200 my-2" />
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* Footer RGPD */}
                <div className="bg-slate-900 text-slate-400 text-[10px] p-3 text-center">
                  Propulsé par Nanasore Email Engine • Conforme RGPD & CNIL UEMOA
                </div>
              </div>
            </div>
          ) : (
            <div className="w-full max-w-xl h-full flex flex-col space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-600 flex items-center gap-1.5">
                  <FileCode className="w-4 h-4 text-blue-600" />
                  Code HTML compilé pour Brevo API
                </span>
                <button
                  type="button"
                  onClick={copyHtml}
                  className="px-3 py-1 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold flex items-center gap-1 shadow-sm transition-all"
                >
                  {isCopiedHtml ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{isCopiedHtml ? 'Code copié !' : 'Copier le HTML'}</span>
                </button>
              </div>
              <pre className="text-[11px] font-mono bg-slate-900 text-emerald-400 p-5 rounded-2xl overflow-auto max-h-[560px] border border-slate-800 shadow-xl leading-relaxed">
                {generateHtmlOutput()}
              </pre>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
export default EmailBuilderStudio;
