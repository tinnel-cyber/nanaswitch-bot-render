import React from 'react';
import { sanitizeRichHtml } from '../../../../utils/security';

/**
 * Nettoie et extrait le texte brut d'une chaîne HTML
 */
export function stripHtmlToPlainText(html: string): string {
  if (!html) return '';
  return html
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Renvoie product.shortDescription ou extrait proprement les premiers caractères
 * en texte brut (sans balise HTML) depuis richDescription ou description.
 */
export function getSmartShortDescription(product: any, maxLength: number = 140): string {
  if (!product) return '';
  if (product.shortDescription && typeof product.shortDescription === 'string' && product.shortDescription.trim()) {
    return product.shortDescription.trim();
  }
  const source = product.richDescription || product.description || '';
  const plain = stripHtmlToPlainText(source);
  if (!plain) return '';
  if (plain.length <= maxLength) return plain;
  return plain.slice(0, maxLength).trim() + '...';
}

/**
 * Renvoie le HTML Rich Text complet pour la fiche produit
 */
export function getSmartRichDescription(product: any): string {
  if (!product) return '';
  return product.richDescription || product.description || '';
}

export interface AdaptiveProductRichTextProps {
  html?: string;
  themeVariant?: 'light' | 'dark' | 'shopify' | 'digital';
  className?: string;
}

/**
 * Composant universel de rendu Rich Text adapté aux thèmes (Shopify, Dark, Light, Digital)
 */
export const AdaptiveProductRichText: React.FC<AdaptiveProductRichTextProps> = ({
  html = '',
  themeVariant = 'shopify',
  className = ''
}) => {
  if (!html || !html.trim()) {
    return (
      <div className={`text-slate-500 text-sm leading-relaxed ${className}`}>
        <p>
          Ce produit n&apos;a pas encore de description détaillée renseignée. Tous nos articles sont vérifiés par notre équipe, garantis 100% authentiques et emballés avec le plus grand soin.
        </p>
      </div>
    );
  }

  const isHtml = /<[a-z][\s\S]*>/i.test(html);
  const cleanHtml = sanitizeRichHtml(html);

  const themeClasses = themeVariant === 'shopify'
    ? 'text-slate-800 [&_h2]:text-xl [&_h2]:font-bold [&_h2]:text-slate-900 [&_h2]:mt-6 [&_h2]:mb-3 [&_h3]:text-lg [&_h3]:font-bold [&_h3]:text-slate-900 [&_h3]:mt-4 [&_h3]:mb-2 [&_p]:mb-3 [&_p]:leading-relaxed [&_ul]:list-disc [&_ul]:pl-6 [&_ul]:space-y-1.5 [&_ol]:list-decimal [&_ol]:pl-6 [&_ol]:space-y-1.5 [&_table]:w-full [&_table]:border [&_table]:border-slate-200 [&_table]:my-4 [&_th]:border [&_th]:border-slate-200 [&_th]:bg-slate-50 [&_th]:p-2.5 [&_th]:font-bold [&_th]:text-slate-900 [&_td]:border [&_td]:border-slate-200 [&_td]:p-2.5 [&_strong]:font-bold [&_strong]:text-slate-900 [&_img]:max-w-full [&_img]:rounded-lg [&_img]:my-4'
    : themeVariant === 'dark'
    ? 'text-slate-300 [&_h2]:text-xl [&_h2]:font-bold [&_h2]:text-white [&_h2]:mt-6 [&_h2]:mb-3 [&_h3]:text-lg [&_h3]:font-bold [&_h3]:text-slate-100 [&_h3]:mt-4 [&_h3]:mb-2 [&_p]:mb-3 [&_p]:leading-relaxed [&_ul]:list-disc [&_ul]:pl-6 [&_ul]:space-y-1.5 [&_ol]:list-decimal [&_ol]:pl-6 [&_ol]:space-y-1.5 [&_table]:w-full [&_table]:border [&_table]:border-slate-700 [&_table]:my-4 [&_th]:border [&_th]:border-slate-700 [&_th]:bg-slate-800 [&_th]:p-2.5 [&_th]:font-bold [&_th]:text-white [&_td]:border [&_td]:border-slate-700 [&_td]:p-2.5 [&_strong]:font-bold [&_strong]:text-white [&_img]:max-w-full [&_img]:rounded-lg [&_img]:my-4'
    : themeVariant === 'digital'
    ? 'text-slate-800 [&_h2]:text-xl [&_h2]:font-extrabold [&_h2]:text-blue-600 [&_h2]:mt-6 [&_h2]:mb-3 [&_h3]:text-lg [&_h3]:font-bold [&_h3]:text-slate-900 [&_h3]:mt-4 [&_h3]:mb-2 [&_p]:mb-3 [&_p]:leading-relaxed [&_ul]:list-disc [&_ul]:pl-6 [&_ul]:space-y-1.5 [&_ol]:list-decimal [&_ol]:pl-6 [&_ol]:space-y-1.5 [&_table]:w-full [&_table]:border [&_table]:border-blue-100 [&_table]:my-4 [&_th]:border [&_th]:border-blue-100 [&_th]:bg-blue-50/50 [&_th]:p-2.5 [&_th]:font-bold [&_th]:text-blue-900 [&_td]:border [&_td]:border-blue-100 [&_td]:p-2.5 [&_strong]:font-bold [&_strong]:text-slate-900 [&_img]:max-w-full [&_img]:rounded-xl [&_img]:my-4'
    : 'text-slate-700 [&_h2]:text-lg [&_h2]:font-bold [&_h2]:text-slate-900 [&_h2]:mt-4 [&_h2]:mb-2 [&_p]:mb-2.5 [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:space-y-1';

  if (!isHtml) {
    return (
      <div className={`whitespace-pre-line text-sm leading-relaxed ${themeClasses} ${className}`}>
        {html}
      </div>
    );
  }

  return (
    <div
      className={`prose max-w-none text-sm leading-relaxed ${themeClasses} ${className}`}
      dangerouslySetInnerHTML={{ __html: cleanHtml }}
    />
  );
};

export default AdaptiveProductRichText;
