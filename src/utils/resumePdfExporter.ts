import { domToCanvas } from 'modern-screenshot';
import { jsPDF } from 'jspdf';

export interface ExportPdfOptions {
  filename?: string;
  quality?: number; // scale multiplier (défaut : 2.5 pour un rendu net ~300 DPI)
  autoSave?: boolean; // si false, retourne une fonction save() sans déclencher le téléchargement immédiat
  onProgress?: (step: 'PREPARING' | 'RENDERING' | 'COMPRESSING' | 'SAVING' | 'DONE') => void;
}

export interface ExportPdfResult {
  success: boolean;
  fileSizeBytes?: number;
  formattedSize?: string;
  save?: () => void;
  error?: string;
}

/**
 * Moteur d'exportation PDF Haute Fidélité Couleur (modern-screenshot + jsPDF Flate/JPEG adaptatif).
 *
 * Avantages clés :
 * 1. Moteur de rendu natif du navigateur (SVG foreignObject) : 100 % compatible Tailwind CSS v4
 *    (`oklch`, `oklab`, `color-mix`, variables CSS, dégradés, ombres, SVG, polices web).
 * 2. Haute définition sans perte visuelle : scale 2.5 (~1985x2808 px) + JPEG 0.92 adaptatif
 *    (puis 0.86 / 0.80 uniquement si > 1.6 Mo) + compression de flux PDF Deflate (`SLOW`).
 * 3. Isolation DOM & attente de décodage des images/polices pour éviter tout texte coupé ou photo blanche.
 */
export async function exportResumeToHdPdf(
  element: HTMLElement,
  options: ExportPdfOptions = {}
): Promise<ExportPdfResult> {
  const {
    filename = 'CV_Professionnel.pdf',
    quality = 2.5,
    autoSave = true,
    onProgress
  } = options;

  let sandboxContainer: HTMLDivElement | null = null;

  try {
    if (!element) {
      throw new Error("Le conteneur DOM du CV est introuvable ou non monté.");
    }

    if (onProgress) onProgress('PREPARING');

    // 1. Attente non bloquante des polices (max 500ms)
    if (typeof document !== 'undefined' && (document as any).fonts?.ready) {
      try {
        await Promise.race([
          (document as any).fonts.ready,
          new Promise((r) => setTimeout(r, 500))
        ]);
      } catch (fontErr) {
        console.warn('[CV EXPORT HD] Polices prêtes avec avertissement non bloquant :', fontErr);
      }
    }

    // 2. Clone isolé aux dimensions exactes A4 (794x1123 px à 96 DPI) avec opacité 100%
    sandboxContainer = document.createElement('div');
    sandboxContainer.id = 'cv-export-sandbox-isolated';
    sandboxContainer.style.position = 'fixed';
    sandboxContainer.style.top = '0';
    sandboxContainer.style.left = '-9999px';
    sandboxContainer.style.width = '794px';
    sandboxContainer.style.height = '1123px';
    sandboxContainer.style.overflow = 'hidden';
    sandboxContainer.style.zIndex = '-9999';
    sandboxContainer.style.opacity = '1';
    sandboxContainer.style.visibility = 'visible';
    sandboxContainer.style.pointerEvents = 'none';
    sandboxContainer.style.backgroundColor = '#ffffff';

    const clonedCv = element.cloneNode(true) as HTMLElement;
    clonedCv.id = 'cloned-cv-document-for-pdf';
    clonedCv.style.transform = 'none';
    clonedCv.style.margin = '0 auto';
    clonedCv.style.width = '794px';
    clonedCv.style.height = '1123px';
    clonedCv.style.minHeight = '1123px';
    clonedCv.style.maxHeight = '1123px';
    clonedCv.style.boxShadow = 'none';
    clonedCv.style.filter = 'none';
    clonedCv.style.opacity = '1';
    (clonedCv.style as any).colorAdjust = 'exact';
    (clonedCv.style as any).webkitPrintColorAdjust = 'exact';

    sandboxContainer.appendChild(clonedCv);
    document.body.appendChild(sandboxContainer);

    // Attente du décodage des images (photo de profil, logos) sans bloquer indéfiniment
    const imgs = Array.from(clonedCv.querySelectorAll('img'));
    if (imgs.length > 0) {
      await Promise.race([
        Promise.all(
          imgs.map((img) =>
            img.complete
              ? (typeof img.decode === 'function' ? img.decode().catch(() => {}) : Promise.resolve())
              : new Promise((res) => {
                  img.onload = res;
                  img.onerror = res;
                })
          )
        ),
        new Promise((r) => setTimeout(r, 1500))
      ]);
    }

    // Pause minimale de peinture navigateur
    await new Promise((r) => setTimeout(r, 100));

    if (onProgress) onProgress('RENDERING');

    // 3. Capture Canvas Haute Résolution via le moteur natif du navigateur (modern-screenshot)
    const safeScale = Math.min(3, Math.max(1.5, Number(quality) || 2.5));
    const canvasPromise = domToCanvas(clonedCv, {
      scale: safeScale,
      width: 794,
      height: 1123,
      backgroundColor: '#ffffff',
      quality: 1,
      timeout: 10000,
      fetch: {
        requestInit: { mode: 'cors' },
        bypassingCache: false,
      },
    });

    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error("Le délai de calcul graphique a expiré (12s).")), 12000);
    });

    const canvas = await Promise.race([canvasPromise, timeoutPromise]);

    if (!canvas || canvas.width === 0 || canvas.height === 0) {
      throw new Error("La capture graphique a produit une image vide. Veuillez réessayer.");
    }

    if (onProgress) onProgress('COMPRESSING');

    // 4. Compression adaptative haute netteté (préserve la finesse des textes et les couleurs)
    let imgData = canvas.toDataURL('image/jpeg', 0.92);
    if (imgData.length > 2_500_000) {
      imgData = canvas.toDataURL('image/jpeg', 0.82);
    } else if (imgData.length > 1_600_000) {
      imgData = canvas.toDataURL('image/jpeg', 0.87);
    }

    if (!imgData || imgData === 'data:,' || imgData.length < 100) {
      throw new Error("L'encodage couleur du CV a échoué.");
    }

    if (onProgress) onProgress('SAVING');

    // 5. Assemblage PDF A4 avec compression interne des flux Deflate (compress: true + 'SLOW')
    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
      compress: true,
    });

    pdf.addImage(imgData, 'JPEG', 0, 0, 210, 297, undefined, 'SLOW');

    const cleanFilename = filename.endsWith('.pdf') ? filename : `${filename}.pdf`;
    const pdfOutput = pdf.output('arraybuffer');
    const fileSizeBytes = pdfOutput.byteLength;
    const formattedSize = fileSizeBytes > 1024 * 1024
      ? `${(fileSizeBytes / (1024 * 1024)).toFixed(2)} Mo`
      : `${Math.round(fileSizeBytes / 1024)} Ko`;

    const triggerSave = () => {
      pdf.save(cleanFilename);
    };

    if (autoSave) {
      triggerSave();
      if (onProgress) onProgress('DONE');
    }

    return {
      success: true,
      fileSizeBytes,
      formattedSize,
      save: triggerSave,
    };
  } catch (error: any) {
    const message = error?.message || 'Erreur lors de la création du fichier PDF.';
    console.error('[CV EXPORT HD] Échec lors de la génération du PDF :', error);
    return { success: false, error: message };
  } finally {
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
