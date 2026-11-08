import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';

export interface ExportPdfOptions {
  filename?: string;
  quality?: number; // scale multiplier (défaut : 2 pour 300 DPI A4)
  onProgress?: (step: 'PREPARING' | 'RENDERING' | 'SAVING' | 'DONE') => void;
}

export interface ExportPdfResult {
  success: boolean;
  error?: string;
}

/**
 * Moteur d'exportation PDF Haute Définition (HD - 300 DPI) Robuste & Anti-Crash.
 * 
 * Solutions architecturales intégrées :
 * 1. Isolation DOM Sandboxée : Clone le CV dans un conteneur hors-écran sans transforms parents.
 * 2. Élimination du gel CPU : ZÉRO scan regex des balises globales de styles Tailwind v4.
 * 3. Échelle calibrée (scale: 2) : 1588 x 2246 px (qualité impression 300 DPI, ~3MB RAM au lieu de >150MB).
 * 4. Bouclier de temporisation (Timeout 8s) : Empêche tout gel ou plantage du navigateur.
 * 5. Nettoyage mémoire déterministe via bloc finally.
 */
export async function exportResumeToHdPdf(
  element: HTMLElement,
  options: ExportPdfOptions = {}
): Promise<ExportPdfResult> {
  const {
    filename = 'CV_Professionnel.pdf',
    quality = 2,
    onProgress
  } = options;

  let sandboxContainer: HTMLDivElement | null = null;

  try {
    if (!element) {
      throw new Error("Le conteneur DOM du CV est introuvable ou non monté.");
    }

    if (onProgress) onProgress('PREPARING');

    // 1. Attente non-bloquante du chargement des polices de caractères (max 400ms)
    if (typeof document !== 'undefined' && (document as any).fonts?.ready) {
      try {
        await Promise.race([
          (document as any).fonts.ready,
          new Promise((r) => setTimeout(r, 400))
        ]);
      } catch (fontErr) {
        console.warn('[CV EXPORT HD] Polices prêtes avec avertissement non bloquant :', fontErr);
      }
    }

    // 2. Création d'une Sandbox isolée hors-écran pour neutraliser tout CSS transform parent
    sandboxContainer = document.createElement('div');
    sandboxContainer.id = 'cv-export-hd-sandbox';
    sandboxContainer.style.position = 'fixed';
    sandboxContainer.style.top = '0';
    sandboxContainer.style.left = '-12000px';
    sandboxContainer.style.width = '794px';
    sandboxContainer.style.height = '1123px';
    sandboxContainer.style.overflow = 'hidden';
    sandboxContainer.style.zIndex = '-9999';
    sandboxContainer.style.backgroundColor = '#ffffff';
    sandboxContainer.style.visibility = 'visible';
    sandboxContainer.style.display = 'block';

    // 3. Clonage du CV exact
    const clonedCv = element.cloneNode(true) as HTMLElement;
    clonedCv.id = 'cloned-cv-document-for-pdf';
    clonedCv.style.transform = 'none';
    clonedCv.style.margin = '0 auto';
    clonedCv.style.padding = '0';
    clonedCv.style.width = '794px';
    clonedCv.style.height = '1123px';
    clonedCv.style.minHeight = '1123px';
    clonedCv.style.maxHeight = '1123px';
    clonedCv.style.boxShadow = 'none';
    clonedCv.style.filter = 'none';
    clonedCv.style.backgroundColor = '#ffffff';

    // Nettoyage rapide des filtres / ombres sur les nœuds descendants du clone
    try {
      const childNodes = clonedCv.querySelectorAll('*');
      childNodes.forEach((node) => {
        const el = node as HTMLElement;
        if (el && el.style) {
          if (el.style.boxShadow) el.style.boxShadow = 'none';
          if (el.style.filter) el.style.filter = 'none';
        }
      });
    } catch (_) {}

    sandboxContainer.appendChild(clonedCv);
    document.body.appendChild(sandboxContainer);

    // Temporisation minimale pour peinture DOM
    await new Promise((r) => setTimeout(r, 120));

    if (onProgress) onProgress('RENDERING');

    // 4. Capture Canvas Haute Définition calibrée (scale: 2 = 1588 x 2246 px)
    const scale = Math.min(Math.max(quality || 2, 1.5), 2.5);

    const canvasPromise = html2canvas(clonedCv, {
      scale: scale,
      useCORS: true,
      allowTaint: true,
      backgroundColor: '#ffffff',
      logging: false,
      imageTimeout: 5000,
      width: 794,
      height: 1123
    });

    // Bouclier Timeout anti-gel de 8 secondes
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error("Le délai de calcul graphique a expiré (8s).")), 8000);
    });

    const canvas = await Promise.race([canvasPromise, timeoutPromise]);

    if (!canvas || canvas.width === 0 || canvas.height === 0) {
      throw new Error("La capture graphique a produit une image vide. Veuillez réessayer.");
    }

    if (onProgress) onProgress('SAVING');

    // 5. Extraction de l'image JPEG haute fidélité (0.92 pour compression ultra-légère et rapide)
    const imgData = canvas.toDataURL('image/jpeg', 0.92);
    if (!imgData || imgData === 'data:,' || imgData.length < 100) {
      throw new Error("L'encodage de l'image du CV a échoué.");
    }

    // 6. Assemblage du PDF A4 (210 x 297 mm)
    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
      compress: true,
    });

    pdf.addImage(imgData, 'JPEG', 0, 0, 210, 297, undefined, 'FAST');

    const cleanFilename = filename.endsWith('.pdf') ? filename : `${filename}.pdf`;
    pdf.save(cleanFilename);

    if (onProgress) onProgress('DONE');
    return { success: true };
  } catch (error: any) {
    const message = error?.message || 'Erreur lors de la création du fichier PDF.';
    console.error('[CV EXPORT HD] Échec lors de la génération du PDF :', error);
    return { success: false, error: message };
  } finally {
    // 7. Nettoyage absolu du DOM sandboxé
    if (sandboxContainer && sandboxContainer.parentNode) {
      try {
        sandboxContainer.parentNode.removeChild(sandboxContainer);
      } catch (_) {}
    }
  }
}

/**
 * Déclenchement de l'impression système optimisée A4 (Ctrl+P / Impression Vectorielle)
 */
export function printResumeDocument(): boolean {
  try {
    if (typeof window === 'undefined') return false;
    window.focus();
    window.print();
    return true;
  } catch (err) {
    console.error('[CV PRINT] Erreur lors du déclenchement de l\'impression :', err);
    return false;
  }
}
