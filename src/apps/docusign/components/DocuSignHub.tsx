import React, { useState, useRef, useEffect, useCallback } from 'react';
import { 
  FileText, Camera, Upload, Check, Trash2, ArrowLeft, 
  ArrowRight, Download, Share2, Plus, PenTool, ShieldCheck, 
  RotateCcw, X, Mail, Printer, Receipt, FileCheck, Sparkles,
  Calendar, User, Sliders, Crop, FileDown, Sun, Contrast, Scale
} from 'lucide-react';
import { jsPDF } from 'jspdf';
import { StoreUser, StoreSubscription } from '../../../types';
import { db, auth } from '../../../firebase';
import { supabase } from '@/lib/supabase';
import { playValidationBeep, playTapBeep } from '../../../utils/audio';
import { LegalAiAdvisorWidget } from '../../../components/LegalAiAdvisorWidget';
import { 
  getGeneratedDocumentsCount, 
  incrementGeneratedDocumentsCount, 
  isLimitReached, 
  triggerLimitReachedUpsell 
} from '../../../utils/planFeatures';

export interface DocuSignHubProps {
  onClose: () => void;
  initialDocTitle?: string;
  initialDocumentImage?: string;
  currentUser?: StoreUser | null;
  subscription?: StoreSubscription | null;
  onOpenUpgrade?: () => void;
}

interface OverlayItem {
  id: number;
  type: 'signature' | 'stamp' | 'badge' | 'name' | 'date' | 'signature_placeholder';
  content: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface UploadedDoc {
  id: string;
  name: string;
  url: string;
  isBlobUrl?: boolean;
}

// Helper : Compression immédiate côté client pour tout document / image importé
const compressImageFile = (file: File): Promise<string> => {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const src = e.target?.result as string;
      if (!src) {
        resolve('');
        return;
      }
      const img = new Image();
      img.onload = () => {
        const MAX_WIDTH = 1600;
        const MAX_HEIGHT = 2000;
        let { width, height } = img;
        if (width > MAX_WIDTH || height > MAX_HEIGHT) {
          const ratio = Math.min(MAX_WIDTH / width, MAX_HEIGHT / height);
          width = Math.round(width * ratio);
          height = Math.round(height * ratio);
        }
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(src);
          return;
        }
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, width, height);
        ctx.drawImage(img, 0, 0, width, height);
        // Format JPEG compressé à 0.82 pour légèreté maximale et netteté irréprochable
        const compressed = canvas.toDataURL('image/jpeg', 0.82);
        resolve(compressed);
      };
      img.onerror = () => resolve(src);
      img.src = src;
    };
    reader.onerror = () => resolve('');
    reader.readAsDataURL(file);
  });
};

// Helper : Conversion robuste page par page de fichiers PDF en images Canvas haute résolution
const renderPdfFileToImages = async (file: File): Promise<string[]> => {
  const arrayBuffer = await file.arrayBuffer();
  const pdfjsLib = await import('pdfjs-dist');
  if (!pdfjsLib.GlobalWorkerOptions.workerSrc) {
    pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version || '5.4.624'}/pdf.worker.min.mjs`;
  }
  const loadingTask = pdfjsLib.getDocument({ data: new Uint8Array(arrayBuffer) });
  const pdf = await loadingTask.promise;
  const pageImages: string[] = [];

  for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
    const page = await pdf.getPage(pageNum);
    const viewport = page.getViewport({ scale: 1.5 });
    const canvas = document.createElement('canvas');
    canvas.width = viewport.width;
    canvas.height = viewport.height;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      await page.render({
        canvasContext: ctx,
        viewport
      } as any).promise;
      pageImages.push(canvas.toDataURL('image/jpeg', 0.85));
    }
  }
  return pageImages;
};

// Helper : Filtres avancés de numérisation (Rognage, Contraste, Luminosité, Binarisation N&B)
export interface ScanAdjustmentState {
  cropTop: number;
  cropBottom: number;
  cropLeft: number;
  cropRight: number;
  filter: 'BW_DOCUMENT' | 'GRAYSCALE' | 'ENHANCE' | 'ORIGINAL';
  contrast: number; // -50 à 50
  brightness: number; // -50 à 50
}

const applyScanFiltersToCanvas = (
  sourceImg: HTMLImageElement,
  adj: ScanAdjustmentState
): HTMLCanvasElement => {
  const canvas = document.createElement('canvas');
  const cropX = Math.round((adj.cropLeft / 100) * sourceImg.width);
  const cropY = Math.round((adj.cropTop / 100) * sourceImg.height);
  const cropW = Math.max(10, Math.round(sourceImg.width * (1 - (adj.cropLeft + adj.cropRight) / 100)));
  const cropH = Math.max(10, Math.round(sourceImg.height * (1 - (adj.cropTop + adj.cropBottom) / 100)));

  canvas.width = cropW;
  canvas.height = cropH;
  const ctx = canvas.getContext('2d');
  if (!ctx) return canvas;

  ctx.drawImage(sourceImg, cropX, cropY, cropW, cropH, 0, 0, cropW, cropH);

  if (adj.filter === 'ORIGINAL' && adj.contrast === 0 && adj.brightness === 0) {
    return canvas;
  }

  const imgData = ctx.getImageData(0, 0, cropW, cropH);
  const data = imgData.data;
  const contrastFactor = (259 * (adj.contrast + 255)) / (255 * (259 - adj.contrast));

  let totalLum = 0;
  for (let i = 0; i < data.length; i += 4) {
    totalLum += 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
  }
  const avgLum = totalLum / (data.length / 4);
  const threshold = Math.max(70, Math.min(190, avgLum + adj.brightness));

  for (let i = 0; i < data.length; i += 4) {
    let r = data[i];
    let g = data[i + 1];
    let b = data[i + 2];

    if (adj.brightness !== 0 && adj.filter !== 'BW_DOCUMENT') {
      r += adj.brightness;
      g += adj.brightness;
      b += adj.brightness;
    }

    if (adj.contrast !== 0 && adj.filter !== 'BW_DOCUMENT') {
      r = contrastFactor * (r - 128) + 128;
      g = contrastFactor * (g - 128) + 128;
      b = contrastFactor * (b - 128) + 128;
    }

    const gray = 0.299 * r + 0.587 * g + 0.114 * b;

    if (adj.filter === 'BW_DOCUMENT') {
      const v = gray > threshold ? 255 : 0;
      data[i] = v;
      data[i + 1] = v;
      data[i + 2] = v;
    } else if (adj.filter === 'GRAYSCALE') {
      const clamped = Math.max(0, Math.min(255, gray));
      data[i] = clamped;
      data[i + 1] = clamped;
      data[i + 2] = clamped;
    } else if (adj.filter === 'ENHANCE') {
      const boost = 1.25;
      data[i] = Math.max(0, Math.min(255, (r - 128) * boost + 128));
      data[i + 1] = Math.max(0, Math.min(255, (g - 128) * boost + 128));
      data[i + 2] = Math.max(0, Math.min(255, (b - 128) * boost + 128));
    } else {
      data[i] = Math.max(0, Math.min(255, r));
      data[i + 1] = Math.max(0, Math.min(255, g));
      data[i + 2] = Math.max(0, Math.min(255, b));
    }
  }

  ctx.putImageData(imgData, 0, 0);
  return canvas;
};

// Helper : Générateur automatique de Tampon / Cachet Commercial Professionnel
const generateStampDataUrl = ({
  companyName,
  mention,
  cityAndContact,
  stampShape,
  stampColor,
  dateStr = new Date().toLocaleDateString('fr-FR')
}: {
  companyName: string;
  mention: string;
  cityAndContact: string;
  stampShape: 'RECTANGULAR' | 'CIRCULAR';
  stampColor: string;
  dateStr?: string;
}): string => {
  const canvas = document.createElement('canvas');
  if (stampShape === 'CIRCULAR') {
    canvas.width = 400;
    canvas.height = 400;
    const ctx = canvas.getContext('2d');
    if (!ctx) return '';

    const cx = 200;
    const cy = 200;
    const rOuter = 185;
    const rInner = 145;

    ctx.clearRect(0, 0, 400, 400);
    ctx.strokeStyle = stampColor;
    ctx.fillStyle = stampColor;

    // Double cercle extérieur
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.arc(cx, cy, rOuter, 0, Math.PI * 2);
    ctx.stroke();

    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.arc(cx, cy, rOuter - 8, 0, Math.PI * 2);
    ctx.stroke();

    // Cercle intérieur
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(cx, cy, rInner, 0, Math.PI * 2);
    ctx.stroke();

    // Texte supérieur incurvé
    const drawCurvedText = (text: string, radius: number, startAngle: number, endAngle: number, inward = false) => {
      const chars = text.toUpperCase().split('');
      const totalAngle = endAngle - startAngle;
      const step = totalAngle / Math.max(1, chars.length - 1);
      chars.forEach((ch, i) => {
        const angle = startAngle + i * step;
        ctx.save();
        ctx.translate(cx + Math.cos(angle) * radius, cy + Math.sin(angle) * radius);
        ctx.rotate(angle + (inward ? -Math.PI / 2 : Math.PI / 2));
        ctx.fillText(ch, 0, 0);
        ctx.restore();
      });
    };

    ctx.save();
    ctx.font = 'bold 20px "Arial Black", "Arial", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    const topText = companyName.toUpperCase().slice(0, 32);
    drawCurvedText(topText, (rOuter + rInner) / 2, -Math.PI * 0.85, -Math.PI * 0.15);

    // Étoiles de séparation
    ctx.font = 'bold 16px sans-serif';
    ctx.fillText('★', cx - rInner - 12, cy);
    ctx.fillText('★', cx + rInner + 12, cy);

    // Texte inférieur
    const bottomText = cityAndContact.toUpperCase().slice(0, 32);
    drawCurvedText(bottomText, (rOuter + rInner) / 2, Math.PI * 0.85, Math.PI * 0.15, true);
    ctx.restore();

    // Centre du cercle
    ctx.save();
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    ctx.strokeStyle = stampColor;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(cx - 95, cy - 36);
    ctx.lineTo(cx + 95, cy - 36);
    ctx.moveTo(cx - 95, cy + 36);
    ctx.lineTo(cx + 95, cy + 36);
    ctx.stroke();

    ctx.fillStyle = stampColor;
    ctx.font = 'bold 24px "Arial Black", sans-serif';
    ctx.fillText(mention.toUpperCase(), cx, cy - 8);

    ctx.font = 'bold 15px sans-serif';
    ctx.fillText(`LE ${dateStr}`, cx, cy + 18);

    ctx.font = '10px sans-serif';
    ctx.fillText('SCEAU OFFICIEL • NaNa POS', cx, cy + 50);
    ctx.restore();
  } else {
    // Tampon Rectangulaire
    canvas.width = 500;
    canvas.height = 250;
    const ctx = canvas.getContext('2d');
    if (!ctx) return '';

    ctx.clearRect(0, 0, 500, 250);
    ctx.strokeStyle = stampColor;
    ctx.fillStyle = stampColor;

    // Double encadrement rectangulaire
    ctx.lineWidth = 5;
    ctx.strokeRect(10, 10, 480, 230);

    ctx.lineWidth = 2;
    ctx.strokeRect(18, 18, 464, 214);

    // Étoiles décoratives aux 4 coins
    ctx.font = 'bold 14px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('★', 28, 28);
    ctx.fillText('★', 472, 28);
    ctx.fillText('★', 28, 222);
    ctx.fillText('★', 472, 222);

    // Ligne 1 : Nom de l'entreprise
    ctx.font = 'bold 22px "Arial Black", "Arial", sans-serif';
    ctx.fillText(companyName.toUpperCase().slice(0, 36), 250, 52);

    // Ligne 1 séparation
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(40, 75);
    ctx.lineTo(460, 75);
    ctx.stroke();

    // Mention principale
    ctx.font = '900 28px "Arial Black", sans-serif';
    ctx.fillText(mention.toUpperCase().slice(0, 28), 250, 116);

    // Ligne 2 séparation
    ctx.beginPath();
    ctx.moveTo(40, 152);
    ctx.lineTo(460, 152);
    ctx.stroke();

    // Ligne 3 : Date et Ville/Contact
    ctx.font = 'bold 16px sans-serif';
    ctx.fillText(`LE ${dateStr} • ${cityAndContact.toUpperCase().slice(0, 34)}`, 250, 178);

    ctx.font = '10.5px sans-serif';
    ctx.fillText('CERTIFICATION & CACHET COMMERCIAL ÉLECTRONIQUE', 250, 206);
  }

  return canvas.toDataURL('image/png');
};

export default function DocuSignHub({ 
  onClose, 
  initialDocTitle = "Document Commercial",
  initialDocumentImage,
  currentUser,
  subscription,
  onOpenUpgrade
}: DocuSignHubProps) {
  // Gestion des documents téléversés avec métadonnées et suivi d'état
  const [uploadedDocs, setUploadedDocs] = useState<UploadedDoc[]>(() => {
    return initialDocumentImage
      ? [
          {
            id: `doc-${Date.now()}-init`,
            name: initialDocTitle || 'Page 1',
            url: initialDocumentImage,
            isBlobUrl: initialDocumentImage.startsWith('blob:'),
          },
        ]
      : [];
  });

  // Pages dérivées dynamiquement de la liste de documents
  const pages = uploadedDocs.map((doc) => doc.url);
  const [currentPageIndex, setCurrentPageIndex] = useState(0);

  // Adaptateur setPages pour compatibilité rétroactive
  const setPages = (action: React.SetStateAction<string[]>) => {
    setUploadedDocs((prev) => {
      const currentUrls = prev.map((d) => d.url);
      const nextUrls = typeof action === 'function' ? action(currentUrls) : action;
      return nextUrls.map((url, idx) => {
        const existing = prev.find((d) => d.url === url);
        return (
          existing || {
            id: `doc-${Date.now()}-${idx}-${Math.random().toString(36).substring(2, 6)}`,
            name: `Page ${idx + 1}`,
            url,
            isBlobUrl: url.startsWith('blob:'),
          }
        );
      });
    });
  };

  // État de l'Assistant IA Juridique & Financier OHADA
  const [isLegalAiOpen, setIsLegalAiOpen] = useState<boolean>(false);

  // État de l'appareil photo pour scanner
  const [isCameraActive, setIsCameraActive] = useState(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // État du Studio Numériseur / Scanner Réel
  const [capturedScanRawImage, setCapturedScanRawImage] = useState<string | null>(null);
  const [scanAdjustments, setScanAdjustments] = useState<ScanAdjustmentState>({
    cropTop: 0,
    cropBottom: 0,
    cropLeft: 0,
    cropRight: 0,
    filter: 'BW_DOCUMENT',
    contrast: 15,
    brightness: 10
  });
  const [scanPreviewUrl, setScanPreviewUrl] = useState<string | null>(null);

  // État du mode signature / tampon
  const [activeTool, setActiveTool] = useState<'signature' | 'stamp' | 'badge' | null>(null);
  const [inkColor, setInkColor] = useState('#1e40af'); // Bleu encre par défaut
  
  // Signature pad
  const sigCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [, setSavedSignature] = useState<string | null>(null);

  // Éléments superposés placés sur la page en cours : { id, type, x, y, content, width, height }
  const [pageOverlays, setPageOverlays] = useState<Record<number, OverlayItem[]>>({});
  const [selectedOverlayId, setSelectedOverlayId] = useState<number | null>(null);

  // Suppression individuelle d'un document téléversé avec nettoyage mémoire et réalignement des calques
  const handleRemoveDocument = (docIdToRemove: string) => {
    const docToRemove = uploadedDocs.find((d) => d.id === docIdToRemove);
    if (docToRemove && docToRemove.url && (docToRemove.isBlobUrl || docToRemove.url.startsWith('blob:'))) {
      try {
        URL.revokeObjectURL(docToRemove.url);
      } catch (e) {
        console.warn('Erreur lors de la révocation du blob URL :', e);
      }
    }

    const removeIdx = uploadedDocs.findIndex((d) => d.id === docIdToRemove);
    if (removeIdx === -1) return;

    setUploadedDocs((prev) => prev.filter((doc) => doc.id !== docIdToRemove));

    // Réaligner les calques de signatures/tampons selon les index restants
    setPageOverlays((prev) => {
      const next: Record<number, OverlayItem[]> = {};
      Object.keys(prev).forEach((keyStr) => {
        const key = parseInt(keyStr, 10);
        if (key < removeIdx) {
          next[key] = prev[key];
        } else if (key > removeIdx) {
          next[key - 1] = prev[key];
        }
      });
      return next;
    });

    // Mettre à jour l'index actif sans dépassement
    setCurrentPageIndex((prevIdx) => {
      const newLength = uploadedDocs.length - 1;
      if (newLength <= 0) return 0;
      if (prevIdx >= newLength) return newLength - 1;
      if (prevIdx > removeIdx) return prevIdx - 1;
      return prevIdx;
    });

    playTapBeep();
  };

  // Déplacement tactile/souris des overlays
  const [dragItem, setDragItem] = useState<{ id: number; startX: number; startY: number; origX: number; origY: number } | null>(null);

  // État de compression d'image en cours
  const [isCompressing, setIsCompressing] = useState<boolean>(false);

  // Édition en ligne du champ Nom
  const [editingNameId, setEditingNameId] = useState<number | null>(null);

  // Zone réceptrice ciblée pour la signature
  const [targetPlaceholderId, setTargetPlaceholderId] = useState<number | null>(null);

  // Modale unifiée de signature (Option A / Option B)
  const [isSignatureModalOpen, setIsSignatureModalOpen] = useState<boolean>(false);
  const [signatureModalMode, setSignatureModalMode] = useState<'MANUSCRIT' | 'TAMPON'>('MANUSCRIT');

  // Configuration du tampon commercial (Option B)
  const [stampCompanyName, setStampCompanyName] = useState<string>(() => {
    return currentUser?.storeName || 'NaNa COMMERCE';
  });
  const [stampMention, setStampMention] = useState<string>('LU ET APPROUVÉ');
  const [stampContact, setStampContact] = useState<string>(() => {
    const city = currentUser?.city || 'Abidjan';
    const phone = currentUser?.phone || '';
    return `${city} • ${phone}`;
  });
  const [stampShape, setStampShape] = useState<'RECTANGULAR' | 'CIRCULAR'>('RECTANGULAR');
  const [stampColor, setStampColor] = useState<string>('#dc2626'); // Rouge officiel par défaut
  const [stampPreviewUrl, setStampPreviewUrl] = useState<string>('');

  // Actualisation temps réel de l'aperçu du tampon
  useEffect(() => {
    if (isSignatureModalOpen && signatureModalMode === 'TAMPON') {
      const url = generateStampDataUrl({
        companyName: stampCompanyName || 'NaNa POS',
        mention: stampMention || 'LU ET APPROUVÉ',
        cityAndContact: stampContact || 'Abidjan',
        stampShape,
        stampColor,
        dateStr: new Date().toLocaleDateString('fr-FR')
      });
      setStampPreviewUrl(url);
    }
  }, [isSignatureModalOpen, signatureModalMode, stampCompanyName, stampMention, stampContact, stampShape, stampColor]);

  // Actualisation temps réel de l'aperçu du document scanné avec filtres
  useEffect(() => {
    if (!capturedScanRawImage) {
      setScanPreviewUrl(null);
      return;
    }
    const img = new Image();
    img.onload = () => {
      const processed = applyScanFiltersToCanvas(img, scanAdjustments);
      setScanPreviewUrl(processed.toDataURL('image/jpeg', 0.90));
    };
    img.src = capturedScanRawImage;
  }, [capturedScanRawImage, scanAdjustments]);

  // Nettoyage de la caméra au démontage
  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(t => t.stop());
      }
    };
  }, []);

  // 1. Détection du Statut d'Abonnement (stores/{userId}/subscription ou merchants/{userId}/subscription)
  const [liveSubscription, setLiveSubscription] = useState<StoreSubscription | null>(() => {
    if (subscription) return subscription;
    try {
      const saved = localStorage.getItem('nana_store_sub');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  useEffect(() => {
    if (subscription) {
      setLiveSubscription(subscription);
      return;
    }

    const userId = currentUser?.storeId || currentUser?.id || auth.currentUser?.uid;
    if (!userId) return;

    // 1. Lecture locale immédiate
    try {
      const cached = localStorage.getItem(`nana_tenant_${userId}_subscription`);
      if (cached) {
        setLiveSubscription(JSON.parse(cached));
      }
    } catch {}

    // 2. Écouteur Supabase Realtime (remplace Firestore onSnapshot)
    const channelName = `docusign_sub_${userId}_${Math.random().toString(36).substring(7)}`;
    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'subscriptions',
          filter: `tenant_id=eq.${userId}`,
        },
        (payload) => {
          if (payload.new) {
            const row = payload.new as any;
            const updatedSub: StoreSubscription = {
              status: row.status || 'ACTIVE',
              plan: row.plan || 'free',
              expiresAt: row.expires_at ? new Date(row.expires_at).getTime() : Date.now() + 30 * 86400000,
              startedAt: row.created_at ? new Date(row.created_at).getTime() : Date.now(),
            };
            setLiveSubscription(updatedSub);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [subscription, currentUser]);

  // Définition booléenne stricte : isPremium = status === 'active' || plan === 'pro'
  const subStatus = (liveSubscription?.status || '').toString().toLowerCase();
  const subPlan = (liveSubscription?.plan || '').toString().toLowerCase();
  const isPremium = (subStatus === 'active' || subPlan === 'pro' || subPlan.includes('pro')) &&
    (!liveSubscription?.expiresAt || liveSubscription.expiresAt > Date.now());

  // Vérificateur de quota de documents (Plan Gratuit : max 1 document généré ou signé)
  const checkDocumentQuota = (): boolean => {
    const effectiveSub = liveSubscription || subscription;
    const count = getGeneratedDocumentsCount(currentUser?.storeId);
    if (isLimitReached(effectiveSub, 'DOCUMENTS', count)) {
      triggerLimitReachedUpsell('DOCUMENTS', count, 1, 'document signé ou généré');
      return false;
    }
    return true;
  };

  const registerDocumentGenerated = () => {
    incrementGeneratedDocumentsCount(currentUser?.storeId);
  };

  // --- 1. GESTION DES FICHIERS & SCANNER APPAREIL PHOTO ---

  // Upload de fichier avec support natif PDF multi-pages et compression d'images
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []) as File[];
    if (!files.length) return;

    setIsCompressing(true);
    try {
      for (const file of files) {
        const isPdf = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');
        if (isPdf) {
          try {
            const pdfImages = await renderPdfFileToImages(file);
            if (pdfImages.length > 0) {
              const baseDocName = file.name.replace(/\.pdf$/i, '');
              const newDocs: UploadedDoc[] = pdfImages.map((img, pIdx) => ({
                id: `pdf-${Date.now()}-${pIdx}-${Math.random().toString(36).substring(2, 7)}`,
                name: `${baseDocName} (P.${pIdx + 1})`,
                url: img,
                isBlobUrl: img.startsWith('blob:'),
              }));
              setUploadedDocs(prev => [...prev, ...newDocs]);
            }
          } catch (pdfErr) {
            console.error('Erreur lecture PDF :', pdfErr);
            alert("Impossible de lire ce fichier PDF. Vérifiez qu'il s'agit d'un document valide et non protégé.");
          }
        } else {
          const compressedDataUrl = await compressImageFile(file);
          if (compressedDataUrl) {
            const newDoc: UploadedDoc = {
              id: `img-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
              name: file.name,
              url: compressedDataUrl,
              isBlobUrl: compressedDataUrl.startsWith('blob:'),
            };
            setUploadedDocs(prev => [...prev, newDoc]);
          }
        }
      }
      playValidationBeep();
    } catch (err) {
      console.error('Erreur compression image / PDF', err);
    } finally {
      setIsCompressing(false);
      e.target.value = '';
    }
  };

  // Démarrer la caméra arrière pour scanner
  const startCamera = async () => {
    try {
      setIsCameraActive(true);
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: "environment" }, width: { ideal: 1920 } }
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (err: any) {
      alert("Impossible d'accéder à la caméra : " + (err?.message || err));
      setIsCameraActive(false);
    }
  };

  // Capturer une page physique et ouvrir l'Atelier Numériseur Pro
  const capturePage = () => {
    if (!videoRef.current) return;
    const canvas = document.createElement('canvas');
    canvas.width = videoRef.current.videoWidth || 1280;
    canvas.height = videoRef.current.videoHeight || 720;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
    const photoBase64 = canvas.toDataURL('image/jpeg', 0.92);

    stopCamera();
    setCapturedScanRawImage(photoBase64);
    playValidationBeep();
  };

  // Validation de la page scannée traitée dans le document actif
  const handleConfirmScannedPage = () => {
    if (!scanPreviewUrl) return;
    const newDoc: UploadedDoc = {
      id: `scan-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      name: `Scan ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`,
      url: scanPreviewUrl,
      isBlobUrl: scanPreviewUrl.startsWith('blob:'),
    };
    setUploadedDocs(prev => [...prev, newDoc]);
    setCapturedScanRawImage(null);
    playValidationBeep();
  };

  // Téléchargement direct en PDF haute résolution du document scanné
  const handleDownloadScanPdf = () => {
    if (!scanPreviewUrl) return;
    if (!checkDocumentQuota()) return;
    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4'
    });
    const pdfW = pdf.internal.pageSize.getWidth();
    const pdfH = pdf.internal.pageSize.getHeight();
    pdf.addImage(scanPreviewUrl, 'JPEG', 0, 0, pdfW, pdfH);
    pdf.save(`Document_Scanne_${Date.now()}.pdf`);
    registerDocumentGenerated();
    playValidationBeep();
  };

  // Téléchargement direct en image PNG ou JPEG
  const handleDownloadScanImage = (format: 'png' | 'jpeg') => {
    if (!scanPreviewUrl) return;
    if (!checkDocumentQuota()) return;
    const link = document.createElement('a');
    link.href = scanPreviewUrl;
    link.download = `Document_Scanne_${Date.now()}.${format === 'png' ? 'png' : 'jpg'}`;
    link.click();
    registerDocumentGenerated();
    playValidationBeep();
  };

  // Reprendre la photo caméra
  const handleRetakeScan = () => {
    setCapturedScanRawImage(null);
    startCamera();
  };

  // Fermer la caméra
  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
    }
    setIsCameraActive(false);
  };

  // --- 2. GESTION DU DESSIN TACTILE DE SIGNATURE ---

  const startSign = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = sigCanvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.lineWidth = 2.5;
    ctx.lineCap = 'round';
    ctx.strokeStyle = inkColor;

    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;

    const x = clientX - rect.left;
    const y = clientY - rect.top;

    ctx.beginPath();
    ctx.moveTo(x, y);
    setIsDrawing(true);
  };

  const drawSign = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    const canvas = sigCanvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;

    const x = clientX - rect.left;
    const y = clientY - rect.top;

    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const endSign = () => {
    setIsDrawing(false);
  };

  const clearSignCanvas = () => {
    const canvas = sigCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
  };

  const saveDrawnSignature = () => {
    const canvas = sigCanvasRef.current;
    if (!canvas) return;
    const sigData = canvas.toDataURL('image/png');
    setSavedSignature(sigData);
    
    if (targetPlaceholderId) {
      // Si une zone de signature était sélectionnée, on incruste la signature exactement à cet endroit
      setPageOverlays(prev => {
        const current = prev[currentPageIndex] || [];
        return {
          ...prev,
          [currentPageIndex]: current.map(item => {
            if (item.id === targetPlaceholderId) {
              return {
                ...item,
                type: 'signature',
                content: sigData,
                width: Math.max(160, item.width),
                height: Math.max(75, item.height)
              };
            }
            return item;
          })
        };
      });
      setTargetPlaceholderId(null);
    } else {
      // Positionnement propre au tiers inférieur du document
      const viewport = document.getElementById('document-viewport');
      const viewportHeight = viewport ? viewport.clientHeight : 450;
      const viewportWidth = viewport ? viewport.clientWidth : 340;

      const targetY = Math.max(80, Math.floor(viewportHeight * 0.70));
      const targetX = Math.max(10, Math.floor((viewportWidth - 170) / 2));

      addOverlayToCurrentPage({
        type: 'signature',
        content: sigData,
        x: targetX,
        y: targetY,
        width: 170,
        height: 80
      });
    }

    setIsSignatureModalOpen(false);
    setActiveTool(null);
    playValidationBeep();
  };

  // Option B : Sauvegarder et apposer le tampon commercial personnalisé
  const saveCommercialStamp = () => {
    const stampDataUrl = generateStampDataUrl({
      companyName: stampCompanyName || 'NaNa POS',
      mention: stampMention || 'LU ET APPROUVÉ',
      cityAndContact: stampContact || 'Abidjan',
      stampShape,
      stampColor,
      dateStr: new Date().toLocaleDateString('fr-FR')
    });

    const stampWidth = stampShape === 'CIRCULAR' ? 120 : 180;
    const stampHeight = stampShape === 'CIRCULAR' ? 120 : 90;

    if (targetPlaceholderId) {
      // Si une zone réceptrice était ciblée, on y incruste le tampon
      setPageOverlays(prev => {
        const current = prev[currentPageIndex] || [];
        return {
          ...prev,
          [currentPageIndex]: current.map(item => {
            if (item.id === targetPlaceholderId) {
              return {
                ...item,
                type: 'stamp',
                content: stampDataUrl,
                width: stampWidth,
                height: stampHeight
              };
            }
            return item;
          })
        };
      });
      setTargetPlaceholderId(null);
    } else {
      const viewport = document.getElementById('document-viewport');
      const viewportHeight = viewport ? viewport.clientHeight : 450;
      const viewportWidth = viewport ? viewport.clientWidth : 340;

      const targetY = Math.max(80, Math.floor(viewportHeight * 0.65));
      const targetX = Math.max(10, Math.floor((viewportWidth - stampWidth) / 2));

      addOverlayToCurrentPage({
        type: 'stamp',
        content: stampDataUrl,
        x: targetX,
        y: targetY,
        width: stampWidth,
        height: stampHeight
      });
    }

    setIsSignatureModalOpen(false);
    setActiveTool(null);
    playValidationBeep();
  };

  // 1. Ajouter un champ déplaçable "Nom & Prénom"
  const handleAddNameField = () => {
    const defaultName = currentUser?.name || 'Nom du signataire';
    const viewport = document.getElementById('document-viewport');
    const viewportWidth = viewport ? viewport.clientWidth : 340;
    const viewportHeight = viewport ? viewport.clientHeight : 450;

    addOverlayToCurrentPage({
      type: 'name',
      content: defaultName,
      x: Math.max(10, Math.floor((viewportWidth - 180) / 2)),
      y: Math.max(20, Math.floor(viewportHeight * 0.38)),
      width: 180,
      height: 36
    });
    playTapBeep();
  };

  // 2. Ajouter un champ déplaçable "Date du jour"
  const handleAddDateField = () => {
    const dateStr = new Date().toLocaleDateString('fr-FR');
    const viewport = document.getElementById('document-viewport');
    const viewportWidth = viewport ? viewport.clientWidth : 340;
    const viewportHeight = viewport ? viewport.clientHeight : 450;

    addOverlayToCurrentPage({
      type: 'date',
      content: dateStr,
      x: Math.max(10, Math.floor((viewportWidth - 140) / 2)),
      y: Math.max(20, Math.floor(viewportHeight * 0.48)),
      width: 140,
      height: 36
    });
    playTapBeep();
  };

  // 3. Ajouter une zone réceptrice "Signature / Cachet"
  const handleAddSignaturePlaceholder = () => {
    const viewport = document.getElementById('document-viewport');
    const viewportWidth = viewport ? viewport.clientWidth : 340;
    const viewportHeight = viewport ? viewport.clientHeight : 450;

    addOverlayToCurrentPage({
      type: 'signature_placeholder',
      content: '',
      x: Math.max(10, Math.floor((viewportWidth - 180) / 2)),
      y: Math.max(20, Math.floor(viewportHeight * 0.65)),
      width: 180,
      height: 85
    });
    playTapBeep();
  };

  // Ajouter un tampon d'entreprise rapide
  const addStamp = () => {
    const stampDataUrl = generateStampDataUrl({
      companyName: stampCompanyName || 'NaNa POS PRO',
      mention: 'CERTIFIÉ CONFORME',
      cityAndContact: stampContact || 'Abidjan',
      stampShape: 'RECTANGULAR',
      stampColor: '#dc2626',
      dateStr: new Date().toLocaleDateString('fr-FR')
    });
    addOverlayToCurrentPage({
      type: 'stamp',
      content: stampDataUrl,
      x: 80,
      y: 160,
      width: 180,
      height: 90
    });
    playValidationBeep();
  };

  // Ajouter une mention légale
  const addBadge = (badgeText: string) => {
    addOverlayToCurrentPage({
      type: 'badge',
      content: badgeText,
      x: 100,
      y: 140,
      width: 130,
      height: 40
    });
    playTapBeep();
  };

  const addOverlayToCurrentPage = (item: Omit<OverlayItem, 'id'>) => {
    const newItem: OverlayItem = { ...item, id: Date.now() };
    setPageOverlays(prev => ({
      ...prev,
      [currentPageIndex]: [...(prev[currentPageIndex] || []), newItem]
    }));
  };

  // Supprimer un élément
  const removeOverlay = (id: number) => {
    setPageOverlays(prev => ({
      ...prev,
      [currentPageIndex]: (prev[currentPageIndex] || []).filter(item => item.id !== id)
    }));
  };

  // Gestion du glisser-déplacer des éléments sur le document (Touch & Mouse)
  const handleOverlayTouchStart = (item: OverlayItem, e: React.TouchEvent | React.MouseEvent) => {
    setSelectedOverlayId(item.id);
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    setDragItem({
      id: item.id,
      startX: clientX,
      startY: clientY,
      origX: item.x,
      origY: item.y
    });
  };

  const handleContainerMouseMove = (e: React.MouseEvent | React.TouchEvent) => {
    if (!dragItem) return;
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    const deltaX = clientX - dragItem.startX;
    const deltaY = clientY - dragItem.startY;

    const containerEl = document.getElementById('document-viewport');
    const maxX = containerEl ? containerEl.clientWidth : 500;
    const maxY = containerEl ? containerEl.clientHeight : 700;

    setPageOverlays(prev => {
      const current = prev[currentPageIndex] || [];
      return {
        ...prev,
        [currentPageIndex]: current.map(item => {
          if (item.id === dragItem.id) {
            return {
              ...item,
              x: Math.max(0, Math.min(maxX - item.width, dragItem.origX + deltaX)),
              y: Math.max(0, Math.min(maxY - item.height, dragItem.origY + deltaY))
            };
          }
          return item;
        })
      };
    });
  };

  const handleContainerMouseUp = () => {
    setDragItem(null);
  };

  // --- 3. MODÈLES DE DOCUMENTS RAPIDES ET JURIDIQUES INTÉGRÉS ---
  const handleCreateTemplate = (type: 'CONTRAT_PRESTATION' | 'CONTRAT_BAIL' | 'DECHARGE_RESPONSABILITE' | 'RECU' | 'FACTURE') => {
    const canvas = document.createElement('canvas');
    canvas.width = 800;
    canvas.height = 1130;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Fond blanc immaculé
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, 800, 1130);

    // En-tête corporate officiel
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, 0, 800, 75);

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 20px sans-serif';
    ctx.fillText('NaNa POS PRO • SUITE JURIDIQUE & COMMERCIALE', 40, 45);

    ctx.font = '11px sans-serif';
    ctx.fillStyle = '#94a3b8';
    ctx.textAlign = 'right';
    ctx.fillText('Conforme Droit OHADA / UEMOA • Réf. Certifiée', 760, 45);
    ctx.textAlign = 'left';

    const dateStr = new Date().toLocaleDateString('fr-FR');
    const docNum = `DOC-${Math.floor(100000 + Math.random() * 900000)}`;
    const storeName = currentUser?.storeName || 'Nana POS Commerce';

    ctx.fillStyle = '#1e293b';
    ctx.font = 'bold 17px sans-serif';

    let title = 'Document Certifié';
    if (type === 'CONTRAT_PRESTATION') {
      title = `Contrat Prestation • ${docNum}`;
      ctx.fillText(`CONTRAT DE PRESTATION DE SERVICES PROFESSIONNELS • N° ${docNum}`, 40, 115);
    } else if (type === 'CONTRAT_BAIL') {
      title = `Bail Commercial • ${docNum}`;
      ctx.fillText(`CONTRAT DE BAIL COMMERCIAL & PROFESSIONNEL • N° ${docNum}`, 40, 115);
    } else if (type === 'DECHARGE_RESPONSABILITE') {
      title = `Décharge Responsabilité • ${docNum}`;
      ctx.fillText(`BON DE DÉCHARGE DE RESPONSABILITÉ & QUITTANCE • N° ${docNum}`, 40, 115);
    } else if (type === 'RECU') {
      title = `Reçu Caisse • ${docNum}`;
      ctx.fillText(`REÇU DE CAISSE & TRANSACTION • N° ${docNum}`, 40, 115);
    } else {
      title = `Facture Commerciale • ${docNum}`;
      ctx.fillText(`FACTURE COMMERCIALE & PRESTATION • N° ${docNum}`, 40, 115);
    }

    ctx.fillStyle = '#475569';
    ctx.font = '11.5px sans-serif';
    ctx.fillText(`Date d'émission : ${dateStr} à ${new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}`, 40, 142);
    ctx.fillText(`Partie Émettrice : ${storeName} • Point de vente certifié`, 40, 162);
    ctx.fillText(`Partie Bénéficiaire : Client Partenaire / Co-contractant désigné`, 40, 182);

    ctx.strokeStyle = '#e2e8f0';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(40, 202);
    ctx.lineTo(760, 202);
    ctx.stroke();

    if (type === 'CONTRAT_PRESTATION') {
      // 1. Objet
      ctx.fillStyle = '#0f172a';
      ctx.font = 'bold 12px sans-serif';
      ctx.fillText('ARTICLE 1 - OBJET DE LA PRESTATION ET MISSIONS', 40, 235);
      ctx.fillStyle = '#334155';
      ctx.font = '11px sans-serif';
      ctx.fillText('Le Prestataire s\'engage à exécuter avec diligence et expertise technique les prestations de services, de vente,', 40, 255);
      ctx.fillText('de logistique ou de conseil convenues d\'un commun accord au profit du Client.', 40, 272);

      // 2. Obligations
      ctx.fillStyle = '#0f172a';
      ctx.font = 'bold 12px sans-serif';
      ctx.fillText('ARTICLE 2 - OBLIGATIONS DES PARTIES & ASSURANCE QUALITÉ', 40, 310);
      ctx.fillStyle = '#334155';
      ctx.font = '11px sans-serif';
      ctx.fillText('Le Prestataire s\'oblige à une obligation de moyens renforcée selon les règles de l\'art. Le Client s\'engage', 40, 330);
      ctx.fillText('à fournir en temps utile toutes les informations et accès nécessaires à la parfaite exécution de la mission.', 40, 347);

      // 3. Règlement
      ctx.fillStyle = '#0f172a';
      ctx.font = 'bold 12px sans-serif';
      ctx.fillText('ARTICLE 3 - CONDITIONS TARIFAIRES & MODALITÉS DE RÈGLEMENT', 40, 385);
      ctx.fillStyle = '#334155';
      ctx.font = '11px sans-serif';
      ctx.fillText('Les prestations seront réglées aux échéances convenues par Mobile Money (Wave, Orange, MTN), virement ou espèces.', 40, 405);
      ctx.fillText('Tout retard de paiement entraînera l\'application d\'intérêts légaux de plein droit sans mise en demeure préalable.', 40, 422);

      // 4. Confidentialité & Juridiction
      ctx.fillStyle = '#0f172a';
      ctx.font = 'bold 12px sans-serif';
      ctx.fillText('ARTICLE 4 - CONFIDENTIALITÉ, PREUVE NUMÉRIQUE & LITIGES', 40, 460);
      ctx.fillStyle = '#334155';
      ctx.font = '11px sans-serif';
      ctx.fillText('Les parties s\'engagent au strict secret professionnel. La signature électronique apposée sur le présent acte confère', 40, 480);
      ctx.fillText('pleine valeur probante. En cas de différend persistant, le Tribunal de Commerce territorial sera seul compétent.', 40, 497);

    } else if (type === 'CONTRAT_BAIL') {
      // 1. Locaux
      ctx.fillStyle = '#0f172a';
      ctx.font = 'bold 12px sans-serif';
      ctx.fillText('ARTICLE 1 - DÉSIGNATION DES LIEUX & USAGE COMMERCIAL', 40, 235);
      ctx.fillStyle = '#334155';
      ctx.font = '11px sans-serif';
      ctx.fillText('Le Bailleur donne à bail à loyer au Preneur qui accepte, les locaux professionnels et commerciaux ci-désignés,', 40, 255);
      ctx.fillText('destinés exclusivement à l\'exercice légal d\'activités marchandes ou administratives autorisées.', 40, 272);

      // 2. Durée
      ctx.fillStyle = '#0f172a';
      ctx.font = 'bold 12px sans-serif';
      ctx.fillText('ARTICLE 2 - DURÉE DU BAIL & PRÉAVIS DE RÉSILIATION', 40, 310);
      ctx.fillStyle = '#334155';
      ctx.font = '11px sans-serif';
      ctx.fillText('Le présent bail est conclu pour une durée ferme renouvelable par tacite reconduction. Chaque partie peut y', 40, 330);
      ctx.fillText('mettre fin moyennant le respect d\'un préavis écrit et notifié d\'au moins trois (3) mois.', 40, 347);

      // 3. Loyer & Caution
      ctx.fillStyle = '#0f172a';
      ctx.font = 'bold 12px sans-serif';
      ctx.fillText('ARTICLE 3 - LOYER MENSUEL, CHARGES & DÉPÔT DE GARANTIE', 40, 385);
      ctx.fillStyle = '#334155';
      ctx.font = '11px sans-serif';
      ctx.fillText('Le loyer est payable mensuellement d\'avance au plus tard le 5 de chaque mois. Un dépôt de garantie équivalent', 40, 405);
      ctx.fillText('à deux (2) mois de loyer est versé ce jour à titre de caution non productive d\'intérêts.', 40, 422);

      // 4. Entretien
      ctx.fillStyle = '#0f172a';
      ctx.font = 'bold 12px sans-serif';
      ctx.fillText('ARTICLE 4 - ENTRETIEN, RÉPARATIONS LOCATIVES & ASSURANCES', 40, 460);
      ctx.fillStyle = '#334155';
      ctx.font = '11px sans-serif';
      ctx.fillText('Le Preneur supportera toutes les réparations locatives courantes et maintiendra les lieux en état parfait de salubrité.', 40, 480);
      ctx.fillText('Il s\'oblige à souscrire une police d\'assurance garantissant les risques d\'incendie et de responsabilité civile.', 40, 497);

    } else if (type === 'DECHARGE_RESPONSABILITE') {
      // 1. Réception
      ctx.fillStyle = '#0f172a';
      ctx.font = 'bold 12px sans-serif';
      ctx.fillText('ARTICLE 1 - ATTESTATION FORMELLE DE RÉCEPTION CONFORME', 40, 235);
      ctx.fillStyle = '#334155';
      ctx.font = '11px sans-serif';
      ctx.fillText('Le réceptionnaire soussigné atteste et certifie avoir pris livraison effective de l\'ensemble des colis, matériels', 40, 255);
      ctx.fillText('et marchandises commandés, en état irréprochable d\'emballage, de fonctionnement et de stricte conformité.', 40, 272);

      // 2. Dégagement de responsabilité
      ctx.fillStyle = '#0f172a';
      ctx.font = 'bold 12px sans-serif';
      ctx.fillText('ARTICLE 2 - TRANSFERT DE GARDE JURIDIQUE & DÉGAGEMENT TOTAL DE RESPONSABILITÉ', 40, 310);
      ctx.fillStyle = '#334155';
      ctx.font = '11px sans-serif';
      ctx.fillText('À compter de la signature de ce bon, la garde juridique, matérielle et les risques liés à l\'utilisation,', 40, 330);
      ctx.fillText('la conservation ou l\'altération des biens sont transférés intégralement et sans réserve au réceptionnaire.', 40, 347);

      // 3. Quittance
      ctx.fillStyle = '#0f172a';
      ctx.font = 'bold 12px sans-serif';
      ctx.fillText('ARTICLE 3 - VALEUR DE QUITTANCE LIBÉRATOIRE SANS RECOURS', 40, 385);
      ctx.fillStyle = '#334155';
      ctx.font = '11px sans-serif';
      ctx.fillText('Le présent acte constitue quittance libératoire définitive. Il éteint irrévocablement toute contestation ultérieure', 40, 405);
      ctx.fillText('ou réclamation relative aux vices apparents ou quantités livrées pour la commande susmentionnée.', 40, 422);

      // 4. Mentions de preuve
      ctx.fillStyle = '#0f172a';
      ctx.font = 'bold 12px sans-serif';
      ctx.fillText('ARTICLE 4 - VALIDITÉ PROBANTE DE LA SIGNATURE ÉLECTRONIQUE', 40, 460);
      ctx.fillStyle = '#334155';
      ctx.font = '11px sans-serif';
      ctx.fillText('L\'émargement tactile horodaté certifié par Nana POS Pro vaut preuve littérale pleine et entière au sens légal.', 40, 480);
      ctx.fillText('Le document est scellé numériquement et horodaté de manière infalsifiable.', 40, 497);

    } else {
      // Tableau standard (RECU / FACTURE)
      ctx.fillStyle = '#f1f5f9';
      ctx.fillRect(40, 225, 720, 32);

      ctx.fillStyle = '#1e293b';
      ctx.font = 'bold 11px sans-serif';
      ctx.fillText('DÉSIGNATION / RÉFÉRENCE', 55, 245);
      ctx.fillText('QTÉ', 480, 245);
      ctx.fillText('PRIX UNITAIRE', 550, 245);
      ctx.fillText('TOTAL (FCFA)', 660, 245);

      ctx.font = '12px sans-serif';
      ctx.fillStyle = '#334155';
      if (type === 'RECU') {
        ctx.fillText('Marchandises générales (Alimentation & Épicerie)', 55, 285);
        ctx.fillText('1', 485, 285);
        ctx.fillText('15 000', 560, 285);
        ctx.fillText('15 000', 675, 285);

        ctx.fillText('Articles conditionnés / Boissons', 55, 315);
        ctx.fillText('2', 485, 315);
        ctx.fillText('5 000', 560, 315);
        ctx.fillText('10 000', 675, 315);

        ctx.fillStyle = '#0f172a';
        ctx.font = 'bold 15px sans-serif';
        ctx.fillText('TOTAL RÉGLÉ (ESPÈCES / MOBILE MONEY) : 25 000 FCFA', 280, 380);
      } else {
        ctx.fillText('Prestation de vente de marchandises et logistique', 55, 285);
        ctx.fillText('1', 485, 285);
        ctx.fillText('45 000', 560, 285);
        ctx.fillText('45 000', 675, 285);

        ctx.fillText('Frais d\'emballage et transport sécurisé', 55, 315);
        ctx.fillText('1', 485, 315);
        ctx.fillText('3 000', 560, 315);
        ctx.fillText('3 000', 675, 315);

        ctx.fillStyle = '#0f172a';
        ctx.font = 'bold 15px sans-serif';
        ctx.fillText('TOTAL FACTURE TTC : 48 000 FCFA', 410, 380);
      }
    }

    // Bloc réassurance légale
    ctx.fillStyle = '#f8fafc';
    ctx.fillRect(40, 535, 720, 55);
    ctx.strokeStyle = '#e2e8f0';
    ctx.strokeRect(40, 535, 720, 55);
    ctx.fillStyle = '#64748b';
    ctx.font = '10px sans-serif';
    ctx.fillText('MENTIONS LÉGALES & FORCE PROBANTE :', 55, 553);
    ctx.fillText('Document numérique horodaté émis via la Suite Commerciale Nana POS Pro. La signature apposée engage irrévocablement les signataires.', 55, 570);

    // Cadres de signature bilatérale
    // Cadre Gauche (Émetteur / Prestataire / Bailleur)
    ctx.strokeStyle = '#cbd5e1';
    ctx.setLineDash([4, 3]);
    ctx.lineWidth = 1.5;
    ctx.strokeRect(50, 620, 335, 240);

    ctx.fillStyle = '#1e293b';
    ctx.font = 'bold 12px sans-serif';
    ctx.fillText(
      type === 'CONTRAT_BAIL'
        ? 'POUR LE BAILLEUR (Signature & Cachet) :'
        : type === 'DECHARGE_RESPONSABILITE'
        ? 'POUR L\'ÉMETTEUR / LIVREUR :'
        : 'POUR LE PRESTATAIRE (Émetteur) :',
      65,
      645
    );
    ctx.font = '10px sans-serif';
    ctx.fillStyle = '#64748b';
    ctx.fillText(`Fait à Abidjan, le ${dateStr}`, 65, 665);
    ctx.fillText('Mention "Lu et approuvé"', 65, 683);

    // Cadre Droit (Client / Preneur / Réceptionnaire)
    ctx.strokeStyle = '#6366f1';
    ctx.strokeRect(415, 620, 335, 240);
    ctx.setLineDash([]);

    ctx.fillStyle = '#1e293b';
    ctx.font = 'bold 12px sans-serif';
    ctx.fillText(
      type === 'CONTRAT_BAIL'
        ? 'POUR LE PRENEUR / LOCATAIRE :'
        : type === 'DECHARGE_RESPONSABILITE'
        ? 'POUR LE RÉCEPTIONNAIRE (Bénéficiaire) :'
        : 'POUR LE CLIENT CO-CONTRACTANT :',
      430,
      645
    );
    ctx.font = '10px sans-serif';
    ctx.fillStyle = '#6366f1';
    ctx.fillText(`Fait à Abidjan, le ${dateStr}`, 430, 665);
    ctx.fillText('Mention "Bon pour accord" • Signature tactile requise', 430, 683);

    // Pied de page
    ctx.font = '9.5px sans-serif';
    ctx.fillStyle = '#94a3b8';
    ctx.fillText('Document numérique certifié généré par Nana POS Pro SaaS • Tél : +226 70 00 00 00 / +225 07 00 00 00', 40, 1090);

    const docUrl = canvas.toDataURL('image/png');
    setUploadedDocs([{
      id: `template-${Date.now()}`,
      name: title,
      url: docUrl,
      isBlobUrl: false,
    }]);
    setCurrentPageIndex(0);

    // Ajout automatique d'un cadre récepteur de signature pré-positionné
    setPageOverlays({
      0: [
        {
          id: Date.now(),
          type: 'signature_placeholder',
          content: '',
          x: 185,
          y: 290,
          width: 160,
          height: 80
        }
      ]
    });

    playValidationBeep();
  };

  // --- 4. FUSION ET EXPORT FINAL ---

  // Dessin du filigrane semi-transparent en diagonale pour comptes gratuits
  const drawWatermark = (ctx: CanvasRenderingContext2D, width: number, height: number) => {
    ctx.save();
    ctx.translate(width / 2, height / 2);
    ctx.rotate(-45 * Math.PI / 180);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    // Opacité 0.18 (spécification : 0.15 à 0.20)
    ctx.fillStyle = 'rgba(15, 23, 42, 0.18)';
    const mainFontSize = Math.max(22, Math.round(width / 22));
    ctx.font = `bold ${mainFontSize}px sans-serif`;
    ctx.fillText('GÉNÉRÉ VIA NaNa POS - VERSION GRATUITE', 0, 0);

    // Lignes d'encadrement en pointillés subtiles
    ctx.strokeStyle = 'rgba(15, 23, 42, 0.15)';
    ctx.lineWidth = Math.max(1, width / 600);
    ctx.setLineDash([8, 6]);
    ctx.beginPath();
    ctx.moveTo(-width * 0.45, -mainFontSize * 0.8);
    ctx.lineTo(width * 0.45, -mainFontSize * 0.8);
    ctx.moveTo(-width * 0.45, mainFontSize * 0.8);
    ctx.lineTo(width * 0.45, mainFontSize * 0.8);
    ctx.stroke();
    ctx.setLineDash([]);

    // Sous-titre indicatif discret
    ctx.font = `italic ${Math.round(mainFontSize * 0.45)}px sans-serif`;
    ctx.fillStyle = 'rgba(71, 85, 105, 0.16)';
    ctx.fillText('PASSEZ AU FORFAIT PRO POUR RETIRER CE FILIGRANE', 0, mainFontSize * 1.3);

    ctx.restore();
  };

  const renderCertifiedDocumentCanvas = (onComplete: (canvas: HTMLCanvasElement) => void) => {
    if (!pages.length) return;

    const baseImg = new Image();
    baseImg.crossOrigin = "anonymous";
    baseImg.src = pages[currentPageIndex];
    baseImg.onload = () => {
      const finalCanvas = document.createElement('canvas');
      finalCanvas.width = baseImg.width;
      finalCanvas.height = baseImg.height;
      const ctx = finalCanvas.getContext('2d');
      if (!ctx) return;

      // 1. Dessine la page
      ctx.drawImage(baseImg, 0, 0);

      // Échelle entre affichage écran et résolution originale de l'image
      const containerEl = document.getElementById('document-viewport');
      const scale = containerEl ? baseImg.width / containerEl.clientWidth : 1;

      // 2. Dessine les overlays
      const currentItems = pageOverlays[currentPageIndex] || [];
      let pendingImages = 0;

      const checkFinished = () => {
        if (pendingImages <= 0) {
          // Application conditionnelle du filigrane si compte gratuit
          if (!isPremium) {
            drawWatermark(ctx, finalCanvas.width, finalCanvas.height);
          }
          onComplete(finalCanvas);
        }
      };

      if (currentItems.length === 0) {
        if (!isPremium) {
          drawWatermark(ctx, finalCanvas.width, finalCanvas.height);
        }
        onComplete(finalCanvas);
        return;
      }

      currentItems.forEach(item => {
        if (item.type === 'signature' || (item.type === 'stamp' && item.content.startsWith('data:image'))) {
          pendingImages++;
          const sImg = new Image();
          sImg.crossOrigin = "anonymous";
          sImg.src = item.content;
          sImg.onload = () => {
            ctx.drawImage(sImg, item.x * scale, item.y * scale, item.width * scale, item.height * scale);
            pendingImages--;
            checkFinished();
          };
          sImg.onerror = () => {
            pendingImages--;
            checkFinished();
          };
        } else if (item.type === 'stamp') {
          // Fallback tampon texte
          ctx.save();
          ctx.strokeStyle = '#dc2626';
          ctx.lineWidth = 4 * scale;
          ctx.strokeRect(item.x * scale, item.y * scale, item.width * scale, item.height * scale);
          ctx.fillStyle = '#dc2626';
          ctx.font = `bold ${14 * scale}px sans-serif`;
          ctx.textAlign = 'center';
          ctx.fillText("CACHE DE SÉCURITÉ", (item.x + item.width / 2) * scale, (item.y + 25) * scale);
          ctx.font = `${12 * scale}px sans-serif`;
          ctx.fillText(new Date().toLocaleDateString('fr-FR'), (item.x + item.width / 2) * scale, (item.y + 55) * scale);
          ctx.restore();
        } else if (item.type === 'name') {
          ctx.save();
          ctx.fillStyle = '#0f172a';
          ctx.font = `bold ${12 * scale}px sans-serif`;
          ctx.fillText(`Nom & Prénom : ${item.content}`, (item.x + 8) * scale, (item.y + 20) * scale);
          ctx.strokeStyle = '#94a3b8';
          ctx.lineWidth = 1 * scale;
          ctx.beginPath();
          ctx.moveTo((item.x + 8) * scale, (item.y + 26) * scale);
          ctx.lineTo((item.x + item.width - 8) * scale, (item.y + 26) * scale);
          ctx.stroke();
          ctx.restore();
        } else if (item.type === 'date') {
          ctx.save();
          ctx.fillStyle = '#0f172a';
          ctx.font = `bold ${12 * scale}px sans-serif`;
          ctx.fillText(`Date : ${item.content}`, (item.x + 8) * scale, (item.y + 22) * scale);
          ctx.restore();
        } else if (item.type === 'signature_placeholder') {
          // Si non signé, cadre réservé discret
          ctx.save();
          ctx.strokeStyle = '#94a3b8';
          ctx.setLineDash([4 * scale, 3 * scale]);
          ctx.lineWidth = 1.5 * scale;
          ctx.strokeRect(item.x * scale, item.y * scale, item.width * scale, item.height * scale);
          ctx.fillStyle = '#64748b';
          ctx.font = `italic ${10 * scale}px sans-serif`;
          ctx.textAlign = 'center';
          ctx.fillText("Cadre réservé à la signature", (item.x + item.width / 2) * scale, (item.y + item.height / 2) * scale);
          ctx.restore();
        } else if (item.type === 'badge') {
          ctx.save();
          ctx.fillStyle = '#1e3a8a';
          ctx.fillRect(item.x * scale, item.y * scale, item.width * scale, item.height * scale);
          ctx.fillStyle = '#ffffff';
          ctx.font = `bold ${12 * scale}px sans-serif`;
          ctx.textAlign = 'center';
          ctx.fillText(item.content, (item.x + item.width / 2) * scale, (item.y + item.height / 1.6) * scale);
          ctx.restore();
        }
      });

      if (pendingImages === 0) {
        if (!isPremium) {
          drawWatermark(ctx, finalCanvas.width, finalCanvas.height);
        }
        onComplete(finalCanvas);
      }
    };
  };

  const downloadPdfDocument = () => {
    if (!checkDocumentQuota()) return;
    renderCertifiedDocumentCanvas((finalCanvas) => {
      try {
        const isLandscape = finalCanvas.width > finalCanvas.height;
        const pdf = new jsPDF({
          orientation: isLandscape ? 'landscape' : 'portrait',
          unit: 'px',
          format: [finalCanvas.width, finalCanvas.height]
        });
        const imgData = finalCanvas.toDataURL('image/jpeg', 0.95);
        pdf.addImage(imgData, 'JPEG', 0, 0, finalCanvas.width, finalCanvas.height);
        pdf.save(`${initialDocTitle.replace(/\s+/g, '_')}_Signe_Page_${currentPageIndex + 1}.pdf`);
        registerDocumentGenerated();
      } catch (pdfErr) {
        console.error("Erreur génération PDF:", pdfErr);
        generateCertifiedDocument();
      }
    });
  };

  const generateCertifiedDocument = () => {
    if (!checkDocumentQuota()) return;
    renderCertifiedDocumentCanvas((finalCanvas) => {
      try {
        const resultDataUrl = finalCanvas.toDataURL('image/png', 1.0);
        const link = document.createElement('a');
        link.download = `${initialDocTitle.replace(/\s+/g, '_')}_Signe_Page_${currentPageIndex + 1}.png`;
        link.href = resultDataUrl;
        link.click();
        registerDocumentGenerated();
      } catch (exportErr) {
        console.error("Erreur export document signé :", exportErr);
      }
    });
  };

  const printDocument = () => {
    if (!checkDocumentQuota()) return;
    renderCertifiedDocumentCanvas((finalCanvas) => {
      try {
        registerDocumentGenerated();
        const dataUrl = finalCanvas.toDataURL('image/png');
        const printWindow = window.open('', '_blank');
        if (printWindow) {
          printWindow.document.write(`
            <!DOCTYPE html>
            <html>
              <head>
                <title>${initialDocTitle} - Impression</title>
                <style>
                  @page { size: auto; margin: 0; }
                  body { margin: 0; padding: 20px; display: flex; justify-content: center; align-items: center; background: white; position: relative; }
                  img { max-width: 100%; height: auto; display: block; }
                  ${!isPremium ? `
                  @media print {
                    body::after {
                      content: "GÉNÉRÉ VIA NaNa POS - VERSION GRATUITE";
                      position: fixed;
                      top: 50%;
                      left: 50%;
                      transform: translate(-50%, -50%) rotate(-45deg);
                      font-size: 26px;
                      font-weight: 900;
                      color: rgba(0, 0, 0, 0.18) !important;
                      -webkit-print-color-adjust: exact;
                      print-color-adjust: exact;
                      pointer-events: none;
                      z-index: 9999;
                      font-family: sans-serif;
                      text-transform: uppercase;
                      white-space: nowrap;
                    }
                  }
                  ` : ''}
                </style>
              </head>
              <body>
                <img src="${dataUrl}" onload="window.print();window.close();" />
              </body>
            </html>
          `);
          printWindow.document.close();
        } else {
          window.print();
        }
      } catch {
        window.print();
      }
    });
  };

  const shareViaWhatsApp = () => {
    const dateStr = new Date().toLocaleDateString('fr-FR');
    const timeStr = new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
    const editionLabel = isPremium ? "Version Pro Officielle (Sans filigrane)" : "Version Gratuite (Filigrane Nana POS inclus)";
    const text = `Bonjour,\n\nVeuillez trouver la confirmation de signature certifiée du document : *${initialDocTitle}*.\n\n` +
      `📅 Date : ${dateStr} à ${timeStr}\n` +
      `✍️ Statut : Signé manuellement & certifié conforme\n` +
      `🏷️ Édition : ${editionLabel}\n` +
      `🔒 Sécurité : Empreinte numérique Nana POS Pro\n\n` +
      `Ce document fait foi d'accord et de décharge légale.`;
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
  };

  const shareViaEmail = () => {
    const dateStr = new Date().toLocaleDateString('fr-FR');
    const timeStr = new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
    const subject = `[${isPremium ? 'Officiel' : 'Gratuit'}] ${initialDocTitle} - Confirmation & Mentions Légales`;
    const legalNotice = isPremium
      ? "Document officiel certifié sans filigrane tiers - Licence Nana POS Pro active."
      : "Ce document a été certifié sous la version gratuite Nana POS avec filigrane d'authenticité. Pour générer des documents officiels vierges de filigrane, activez le forfait Nana Pro.";
    const body = `Madame, Monsieur,\n\n` +
      `Nous vous confirmons la signature électronique certifiée du document suivant :\n` +
      `• Document : ${initialDocTitle}\n` +
      `• Date et heure d'apposition : ${dateStr} à ${timeStr}\n` +
      `• Édition : ${isPremium ? 'Pro Officielle' : 'Gratuite avec filigrane'}\n` +
      `• Statut : Signé, validé et certifié\n\n` +
      `MENTIONS LÉGALES ET VALIDITÉ JURIDIQUE :\n` +
      `Le présent document a fait l'objet d'un émargement manuscrit tactile horodaté. ` +
      `Conformément à la réglementation sur les transactions électroniques et la preuve numérique, ` +
      `cette signature atteste du consentement plein et entier des parties et vaut décharge contractuelle.\n\n` +
      `${legalNotice}\n\n` +
      `Nana POS Pro - Service Commercial`;
    window.location.href = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950 text-slate-100 flex flex-col font-sans select-none min-h-0">
      
      {/* 1. HEADER DU STUDIO DOCUSIGN */}
      <header className="bg-slate-900 border-b border-slate-800 px-4 py-3 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <button 
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition cursor-pointer"
            title="Fermer"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="font-bold text-sm md:text-base flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-indigo-400" />
              Signature Électronique Certifiée
            </h1>
            <p className="text-xs text-slate-400">{initialDocTitle} • {pages.length} page(s)</p>
          </div>
        </div>

        <div className="flex flex-col items-end gap-1">
          <div className="flex items-center gap-1.5 sm:gap-2 overflow-x-auto max-w-[65vw] sm:max-w-none scrollbar-none py-0.5 shrink-0">
            {/* Bouton IA Juriste OHADA */}
            <button 
              type="button"
              onClick={() => {
                playTapBeep();
                setIsLegalAiOpen((prev) => !prev);
              }}
              className={`px-2.5 sm:px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer shrink-0 transition ${
                isLegalAiOpen
                  ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/30 ring-2 ring-amber-300'
                  : 'bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40'
              }`}
              title="Assistant IA Juridique & Financier (OHADA, Sûretés, Incoterms)"
            >
              <Scale className="w-3.5 h-3.5 text-amber-400" />
              <span className="hidden sm:inline">IA Juriste OHADA</span>
              <span className="sm:hidden">OHADA</span>
            </button>

            {pages.length > 0 && (
              <>
                <button 
                  type="button"
                  onClick={shareViaWhatsApp}
                  className="bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-400 border border-emerald-500/30 px-2.5 sm:px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 cursor-pointer shrink-0"
                  title="Partager sur WhatsApp"
                >
                  <Share2 className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">WhatsApp</span>
                </button>
                <button 
                  type="button"
                  onClick={shareViaEmail}
                  className="bg-blue-600/20 hover:bg-blue-600/30 text-blue-400 border border-blue-500/30 px-2.5 sm:px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 cursor-pointer shrink-0"
                  title="Envoyer par Email / Gmail"
                >
                  <Mail className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Email</span>
                </button>
                <button 
                  type="button"
                  onClick={printDocument}
                  className="bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 px-2.5 sm:px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 cursor-pointer shrink-0"
                  title="Imprimer le document"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Imprimer</span>
                </button>
                <button 
                  type="button"
                  onClick={downloadPdfDocument}
                  className="bg-rose-950/70 hover:bg-rose-900/80 text-rose-300 border border-rose-500/40 px-2.5 sm:px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 cursor-pointer shrink-0"
                  title="Télécharger en PDF certifié"
                >
                  <FileText className="w-3.5 h-3.5 text-rose-400" />
                  <span className="hidden sm:inline">PDF</span>
                </button>
                <button 
                  type="button"
                  onClick={generateCertifiedDocument}
                  className="bg-indigo-600 hover:bg-indigo-500 px-3 sm:px-3.5 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-lg shadow-indigo-600/30 cursor-pointer shrink-0"
                  title="Télécharger Image PNG"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Image</span>
                </button>
              </>
            )}
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
              title="Quitter"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
          {pages.length > 0 && !isPremium && (
            <div className="flex items-center gap-1 text-[10px] text-amber-400/90 font-medium tracking-tight">
              <span>Passez au forfait Pro pour retirer le filigrane de vos documents officiels</span>
              {onOpenUpgrade && (
                <button
                  type="button"
                  onClick={onOpenUpgrade}
                  className="underline hover:text-amber-300 font-semibold cursor-pointer ml-1"
                >
                  Passer en Pro
                </button>
              )}
            </div>
          )}
        </div>
      </header>

      {/* 2. ZONE PRINCIPALE DE TRAVAIL */}
      <div 
        className="flex-1 min-h-0 flex flex-col md:flex-row overflow-hidden relative"
        onMouseMove={handleContainerMouseMove}
        onTouchMove={handleContainerMouseMove}
        onMouseUp={handleContainerMouseUp}
        onTouchEnd={handleContainerMouseUp}
      >
        
        {/* Volet de staging / prévisualisation des documents téléversés */}
        {uploadedDocs.length > 0 && (
          <aside className="w-full md:w-44 lg:w-48 bg-slate-900/80 border-b md:border-b-0 md:border-r border-slate-800 p-2.5 flex flex-col shrink-0 min-h-0 z-10">
            {/* Header du volet de staging */}
            <div className="flex items-center justify-between px-1 mb-2">
              <span className="text-[11px] font-bold tracking-wider uppercase text-slate-400">
                Documents ({uploadedDocs.length})
              </span>
              <label 
                className="p-1 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white cursor-pointer transition" 
                title="Ajouter d'autres documents (PDF ou Image)"
              >
                <Plus className="w-3.5 h-3.5" />
                <input type="file" accept="application/pdf,image/*" multiple onChange={handleFileUpload} className="hidden" />
              </label>
            </div>

            {/* Conteneur scrollable délimité : responsive scrollbar */}
            <div className="flex md:flex-col gap-2.5 overflow-x-auto md:overflow-y-auto max-h-[70vh] pr-2 scrollbar-thin flex-1 min-h-0">
              {uploadedDocs.map((doc, idx) => {
                const isSelected = currentPageIndex === idx;
                return (
                  <div
                    key={doc.id}
                    onClick={() => setCurrentPageIndex(idx)}
                    className={`group relative rounded-xl overflow-hidden border-2 transition shrink-0 cursor-pointer flex flex-col bg-slate-950/60 hover:bg-slate-800/80 ${
                      isSelected 
                        ? "border-indigo-500 shadow-md shadow-indigo-500/10 ring-1 ring-indigo-500/50" 
                        : "border-slate-800/80 opacity-70 hover:opacity-100 hover:border-slate-700"
                    }`}
                  >
                    {/* Miniature du document */}
                    <div className="relative w-full aspect-[3/4] max-h-32 bg-slate-950 overflow-hidden flex items-center justify-center">
                      <img 
                        src={doc.url} 
                        alt={doc.name || `Page ${idx + 1}`} 
                        className="w-full h-full object-cover select-none" 
                      />
                      
                      {/* Numéro de document / page */}
                      <span className="absolute bottom-1 left-1 bg-black/80 backdrop-blur-xs text-[9px] px-1.5 py-0.5 rounded font-bold text-slate-200">
                        #{idx + 1}
                      </span>

                      {/* Bouton de suppression individuelle (Trash2) */}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleRemoveDocument(doc.id);
                        }}
                        className="absolute top-1 right-1 p-1 bg-rose-600/90 hover:bg-rose-600 text-white rounded-md shadow-md transition-all active:scale-95 cursor-pointer z-20"
                        title={`Supprimer ${doc.name || `Page ${idx + 1}`}`}
                        aria-label={`Supprimer ${doc.name || `Page ${idx + 1}`}`}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    {/* Titre & Statut */}
                    <div className="p-1.5 bg-slate-900/95 flex items-center justify-between gap-1 border-t border-slate-800/60">
                      <span className="text-[10px] text-slate-300 font-medium truncate max-w-[110px]" title={doc.name}>
                        {doc.name || `Page ${idx + 1}`}
                      </span>
                      {isSelected && (
                        <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 shrink-0" />
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </aside>
        )}

        {/* Espace Central : Document & Signature */}
        <main className="flex-1 min-h-0 flex flex-col items-center justify-center p-4 bg-slate-950 overflow-y-auto relative">
          
          {/* Si aucun document n'est encore chargé */}
          {pages.length === 0 && !isCameraActive && !capturedScanRawImage && (
            <div className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-3xl p-6 text-center space-y-4 shadow-2xl">
              <div className="w-16 h-16 bg-indigo-600/20 text-indigo-400 rounded-2xl mx-auto flex items-center justify-center">
                <ShieldCheck className="w-8 h-8" />
              </div>
              <div>
                <h2 className="text-base font-bold text-white">Importer ou Créer un document</h2>
                <p className="text-xs text-slate-400 mt-1">
                  Contrats professionnels, baux, décharges, reçus certifiés et documents PDF.
                </p>
              </div>

              {/* Modèles Juridiques Prêts à l'Emploi */}
              <div className="space-y-1.5 text-left pt-1">
                <span className="text-[10.5px] font-bold text-slate-400 uppercase tracking-wide">
                  Modèles juridiques prêts à l'emploi :
                </span>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => handleCreateTemplate('CONTRAT_PRESTATION')}
                    className="p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700/80 border border-slate-700 text-center flex flex-col items-center gap-1 transition cursor-pointer active:scale-95"
                    title="Générer un contrat de prestation de services conforme OHADA"
                  >
                    <FileText className="w-4 h-4 text-indigo-400" />
                    <span className="text-[10px] font-bold text-slate-200">Prestation</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleCreateTemplate('CONTRAT_BAIL')}
                    className="p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700/80 border border-slate-700 text-center flex flex-col items-center gap-1 transition cursor-pointer active:scale-95"
                    title="Générer un contrat de bail commercial / d'habitation"
                  >
                    <ShieldCheck className="w-4 h-4 text-emerald-400" />
                    <span className="text-[10px] font-bold text-slate-200">Bail Pro</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleCreateTemplate('DECHARGE_RESPONSABILITE')}
                    className="p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700/80 border border-slate-700 text-center flex flex-col items-center gap-1 transition cursor-pointer active:scale-95"
                    title="Générer un bon de décharge de responsabilité et quittance"
                  >
                    <FileCheck className="w-4 h-4 text-amber-400" />
                    <span className="text-[10px] font-bold text-slate-200">Décharge</span>
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-2.5 pt-1 border-t border-slate-800">
                <button
                  type="button"
                  onClick={startCamera}
                  className="bg-indigo-600 hover:bg-indigo-500 py-3 rounded-xl text-xs font-bold flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/20 cursor-pointer transition active:scale-95 text-white"
                >
                  <Camera className="w-4 h-4" /> Numériser avec le scanner caméra
                </button>

                <label className="border border-slate-700 hover:border-slate-600 bg-slate-800/80 py-3 rounded-xl text-xs font-bold flex items-center justify-center gap-2 cursor-pointer transition text-slate-200">
                  <Upload className="w-4 h-4 text-slate-400" />
                  <span>Importer un fichier (PDF ou Image)</span>
                  <input type="file" accept="application/pdf,image/*" multiple onChange={handleFileUpload} className="hidden" />
                </label>
              </div>
            </div>
          )}

          {/* Scanner Caméra Plein Écran avec Cadre de Visée */}
          {isCameraActive && (
            <div className="relative w-full max-w-lg bg-black rounded-2xl overflow-hidden border border-slate-800 flex flex-col items-center shadow-2xl">
              <div className="relative w-full h-80 bg-black">
                <video ref={videoRef} autoPlay playsInline className="w-full h-full object-cover" />
                
                {/* Cadre de visée documentaire et repères de coins */}
                <div className="absolute inset-4 border-2 border-dashed border-cyan-400/80 rounded-2xl pointer-events-none flex flex-col justify-between p-2">
                  <div className="flex justify-between text-[10px] font-mono text-cyan-300 font-bold">
                    <span>◤ REPÈRE SCAN</span>
                    <span>REPÈRE SCAN ◥</span>
                  </div>
                  <div className="self-center bg-black/70 px-3 py-1 rounded-full text-[10px] font-bold text-cyan-200 backdrop-blur-xs">
                    Cadrez les 4 bords du document dans ce rectangle
                  </div>
                  <div className="flex justify-between text-[10px] font-mono text-cyan-300 font-bold">
                    <span>◣ ALIGNEMENT</span>
                    <span>ALIGNEMENT ◢</span>
                  </div>
                </div>
              </div>
              
              <div className="p-4 flex items-center justify-between w-full bg-slate-900 border-t border-slate-800">
                <button type="button" onClick={stopCamera} className="text-xs text-slate-400 px-3 py-2 cursor-pointer hover:text-white">
                  Annuler
                </button>

                <button
                  type="button"
                  onClick={capturePage}
                  className="w-14 h-14 bg-white rounded-full border-4 border-slate-300 shadow-xl flex items-center justify-center active:scale-95 transition cursor-pointer"
                  title="Capturer le document"
                >
                  <div className="w-10 h-10 bg-indigo-600 rounded-full" />
                </button>

                <button type="button" onClick={stopCamera} className="bg-emerald-600 hover:bg-emerald-500 px-3.5 py-2 rounded-xl text-xs font-bold text-white cursor-pointer">
                  Fermer
                </button>
              </div>
            </div>
          )}

          {/* Atelier Numériseur Pro & Filtres Documents */}
          {capturedScanRawImage && (
            <div className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-3xl p-4 sm:p-5 space-y-4 shadow-2xl animate-in fade-in duration-150 text-slate-100">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-indigo-600/20 text-indigo-400 flex items-center justify-center">
                    <Sliders className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="font-extrabold text-sm text-white">Atelier Numériseur Pro</h3>
                    <p className="text-[10px] text-slate-400">Rognage, filtres et optimisation du scan</p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleRetakeScan}
                  className="px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs text-slate-300 font-bold flex items-center gap-1 cursor-pointer transition"
                >
                  <RotateCcw className="w-3 h-3" />
                  <span>Reprendre</span>
                </button>
              </div>

              {/* Aperçu en direct du scan traité */}
              <div className="relative bg-slate-950 rounded-2xl border border-slate-800 overflow-hidden max-h-64 flex items-center justify-center p-2 shadow-inner">
                {scanPreviewUrl ? (
                  <img
                    src={scanPreviewUrl}
                    alt="Aperçu Numérisé"
                    className="max-h-60 max-w-full object-contain rounded-lg shadow-md"
                  />
                ) : (
                  <div className="text-xs text-slate-500 py-8">Traitement en cours...</div>
                )}
              </div>

              {/* Sélecteur de filtres documentaires */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-slate-300 uppercase tracking-wider block">
                  Filtre de lisibilité :
                </label>
                <div className="grid grid-cols-4 gap-1.5">
                  {[
                    { id: 'BW_DOCUMENT', label: 'Noir & Blanc', desc: 'Binarisé pro' },
                    { id: 'GRAYSCALE', label: 'Niveaux Gris', desc: 'Net & Sobre' },
                    { id: 'ENHANCE', label: 'Rehaussé', desc: 'Couleur boostée' },
                    { id: 'ORIGINAL', label: 'Original', desc: 'Photo brute' },
                  ].map((flt) => (
                    <button
                      key={flt.id}
                      type="button"
                      onClick={() => {
                        playTapBeep();
                        setScanAdjustments(prev => ({ ...prev, filter: flt.id as any }));
                      }}
                      className={`p-2 rounded-xl text-center cursor-pointer transition border ${
                        scanAdjustments.filter === flt.id
                          ? 'bg-indigo-600 text-white border-indigo-400 shadow-md'
                          : 'bg-slate-950 text-slate-400 border-slate-800 hover:border-slate-700'
                      }`}
                    >
                      <div className="font-bold text-[10.5px] leading-tight">{flt.label}</div>
                      <div className="text-[9px] opacity-75">{flt.desc}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Rognage des marges (Crop Insets) */}
              <div className="p-3 bg-slate-950/80 border border-slate-800 rounded-2xl space-y-2">
                <div className="flex items-center gap-1.5 text-xs font-bold text-slate-300">
                  <Crop className="w-3.5 h-3.5 text-indigo-400" />
                  <span>Rognage des marges / Découpe bords</span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-[10.5px]">
                  <div>
                    <span className="text-slate-400 block mb-0.5">Haut : {scanAdjustments.cropTop}%</span>
                    <input
                      type="range"
                      min={0}
                      max={25}
                      value={scanAdjustments.cropTop}
                      onChange={(e) => setScanAdjustments(prev => ({ ...prev, cropTop: Number(e.target.value) }))}
                      className="w-full accent-indigo-500 cursor-pointer"
                    />
                  </div>
                  <div>
                    <span className="text-slate-400 block mb-0.5">Bas : {scanAdjustments.cropBottom}%</span>
                    <input
                      type="range"
                      min={0}
                      max={25}
                      value={scanAdjustments.cropBottom}
                      onChange={(e) => setScanAdjustments(prev => ({ ...prev, cropBottom: Number(e.target.value) }))}
                      className="w-full accent-indigo-500 cursor-pointer"
                    />
                  </div>
                  <div>
                    <span className="text-slate-400 block mb-0.5">Gauche : {scanAdjustments.cropLeft}%</span>
                    <input
                      type="range"
                      min={0}
                      max={25}
                      value={scanAdjustments.cropLeft}
                      onChange={(e) => setScanAdjustments(prev => ({ ...prev, cropLeft: Number(e.target.value) }))}
                      className="w-full accent-indigo-500 cursor-pointer"
                    />
                  </div>
                  <div>
                    <span className="text-slate-400 block mb-0.5">Droite : {scanAdjustments.cropRight}%</span>
                    <input
                      type="range"
                      min={0}
                      max={25}
                      value={scanAdjustments.cropRight}
                      onChange={(e) => setScanAdjustments(prev => ({ ...prev, cropRight: Number(e.target.value) }))}
                      className="w-full accent-indigo-500 cursor-pointer"
                    />
                  </div>
                </div>
              </div>

              {/* Réglages fins : Contraste & Luminosité */}
              <div className="grid grid-cols-2 gap-3 text-xs bg-slate-950/80 p-3 rounded-2xl border border-slate-800">
                <div>
                  <div className="flex items-center gap-1 text-[11px] font-bold text-slate-300 mb-1">
                    <Contrast className="w-3 h-3 text-amber-400" />
                    <span>Contraste ({scanAdjustments.contrast})</span>
                  </div>
                  <input
                    type="range"
                    min={-40}
                    max={40}
                    value={scanAdjustments.contrast}
                    onChange={(e) => setScanAdjustments(prev => ({ ...prev, contrast: Number(e.target.value) }))}
                    className="w-full accent-amber-500 cursor-pointer"
                  />
                </div>
                <div>
                  <div className="flex items-center gap-1 text-[11px] font-bold text-slate-300 mb-1">
                    <Sun className="w-3 h-3 text-amber-400" />
                    <span>Luminosité ({scanAdjustments.brightness})</span>
                  </div>
                  <input
                    type="range"
                    min={-40}
                    max={40}
                    value={scanAdjustments.brightness}
                    onChange={(e) => setScanAdjustments(prev => ({ ...prev, brightness: Number(e.target.value) }))}
                    className="w-full accent-amber-500 cursor-pointer"
                  />
                </div>
              </div>

              {/* Actions d'export direct et validation */}
              <div className="space-y-2 pt-1 border-t border-slate-800">
                <button
                  type="button"
                  onClick={handleConfirmScannedPage}
                  className="w-full bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-slate-950 font-black text-xs py-3 rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-emerald-950/30 cursor-pointer transition"
                >
                  <Check className="w-4 h-4 text-slate-950" />
                  <span>Insérer dans le document actif</span>
                </button>

                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={handleDownloadScanPdf}
                    className="py-2 rounded-xl bg-rose-950/60 hover:bg-rose-900/60 text-rose-300 border border-rose-500/30 text-[10.5px] font-bold flex items-center justify-center gap-1 cursor-pointer transition"
                    title="Télécharger le scan directement en PDF"
                  >
                    <FileDown className="w-3.5 h-3.5 text-rose-400" />
                    <span>PDF A4</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleDownloadScanImage('png')}
                    className="py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-[10.5px] font-bold flex items-center justify-center gap-1 cursor-pointer transition"
                    title="Télécharger en PNG"
                  >
                    <Download className="w-3.5 h-3.5 text-indigo-400" />
                    <span>PNG</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleDownloadScanImage('jpeg')}
                    className="py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-[10.5px] font-bold flex items-center justify-center gap-1 cursor-pointer transition"
                    title="Télécharger en JPEG"
                  >
                    <Download className="w-3.5 h-3.5 text-blue-400" />
                    <span>JPEG</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Indicateur de compression en cours */}
          {isCompressing && (
            <div className="fixed top-16 left-1/2 -translate-x-1/2 z-50 bg-slate-900/95 border border-indigo-500/50 text-indigo-200 px-4 py-2 rounded-2xl shadow-2xl flex items-center gap-2 text-xs font-bold animate-in fade-in">
              <Sparkles className="w-4 h-4 text-indigo-400 animate-spin" />
              <span>Optimisation & Compression du document en cours...</span>
            </div>
          )}

          {/* Affichage de la page sélectionnée & Déplacement des signatures */}
          {pages.length > 0 && !isCameraActive && (
            <div className="flex flex-col items-center w-full max-w-lg">
              {/* Palette d'éléments interactifs à glisser / déposer */}
              <div className="w-full mb-2.5 flex items-center justify-between gap-1.5 bg-slate-900/95 border border-slate-800 rounded-2xl p-2 shadow-lg select-none">
                <span className="text-[11px] font-bold text-slate-300 flex items-center gap-1.5 pl-1">
                  <Sparkles className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                  <span className="hidden xs:inline">Glisser-Déposer :</span>
                </span>

                <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none py-0.5 max-w-[calc(100vw-110px)] sm:max-w-none shrink-0 justify-end">
                  <button
                    type="button"
                    onClick={() => {
                      playTapBeep();
                      setIsLegalAiOpen(true);
                    }}
                    className="px-2.5 py-1.5 rounded-xl bg-amber-950/80 hover:bg-amber-900/90 text-amber-200 border border-amber-500/40 text-[11px] font-bold flex items-center gap-1 cursor-pointer transition active:scale-95 shrink-0"
                    title="Consulter l'expert juridique OHADA sur ce document"
                  >
                    <Scale className="w-3 h-3 text-amber-400" />
                    <span>Avis Juridique</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleAddNameField}
                    className="px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-[11px] font-bold flex items-center gap-1 cursor-pointer transition active:scale-95 border border-slate-700 shrink-0"
                    title="Ajouter un champ Nom & Prénom déplaçable"
                  >
                    <User className="w-3 h-3 text-blue-400" />
                    <span>+ Nom</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleAddDateField}
                    className="px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-[11px] font-bold flex items-center gap-1 cursor-pointer transition active:scale-95 border border-slate-700 shrink-0"
                    title="Ajouter la date du jour déplaçable"
                  >
                    <Calendar className="w-3 h-3 text-amber-400" />
                    <span>+ Date</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleAddSignaturePlaceholder}
                    className="px-2.5 py-1.5 rounded-xl bg-indigo-950 hover:bg-indigo-900 text-indigo-200 border border-indigo-500/40 text-[11px] font-bold flex items-center gap-1 cursor-pointer transition active:scale-95 shrink-0"
                    title="Ajouter une zone réceptrice de signature ou cachet"
                  >
                    <PenTool className="w-3 h-3 text-indigo-400" />
                    <span>+ Cadre Signature</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setTargetPlaceholderId(null);
                      setIsSignatureModalOpen(true);
                    }}
                    className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-500 hover:to-blue-500 text-white text-[11px] font-extrabold flex items-center gap-1.5 cursor-pointer transition active:scale-95 shadow-md shadow-indigo-600/30 shrink-0"
                    title="Ouvrir le studio de signature ou tampon"
                  >
                    <ShieldCheck className="w-3.5 h-3.5 text-white" />
                    <span>Signer</span>
                  </button>
                </div>
              </div>

              {/* Conteneur relatif du document (Supporte positionnement absolu drag & drop) */}
              <div 
                id="document-viewport" 
                className="relative w-full bg-slate-900 rounded-2xl border border-slate-800 shadow-2xl overflow-hidden select-none"
              >
                <img 
                  src={pages[currentPageIndex]} 
                  alt="Document en cours" 
                  className="w-full h-auto object-contain block pointer-events-none"
                />

                {/* Filigrane conditionnel prévisualisé à l'écran si compte gratuit */}
                {!isPremium && (
                  <div 
                    className="absolute inset-0 pointer-events-none flex flex-col items-center justify-center overflow-hidden z-10 select-none"
                    aria-hidden="true"
                  >
                    <div className="transform -rotate-45 text-center px-4 py-2 border border-dashed border-slate-900/20 bg-slate-900/5 rounded-xl max-w-[90%]">
                      <p className="text-slate-900/20 text-xs sm:text-sm md:text-base font-black tracking-wider uppercase">
                        GÉNÉRÉ VIA NaNa POS - VERSION GRATUITE
                      </p>
                      <p className="text-slate-800/15 text-[8px] sm:text-[9px] font-semibold tracking-wide uppercase">
                        PASSEZ AU FORFAIT PRO POUR RETIRER CE FILIGRANE
                      </p>
                    </div>
                  </div>
                )}

                {/* Éléments superposés déplaçables (Signatures, Tampons, Nom, Date, Cadre Signature, Badges) */}
                {(pageOverlays[currentPageIndex] || []).map((item) => (
                  <div
                    key={item.id}
                    onMouseDown={(e) => handleOverlayTouchStart(item, e)}
                    onTouchStart={(e) => handleOverlayTouchStart(item, e)}
                    style={{
                      position: 'absolute',
                      left: `${item.x}px`,
                      top: `${item.y}px`,
                      width: `${item.width}px`,
                      height: `${item.height}px`
                    }}
                    className={`group cursor-move border-2 rounded-xl touch-none transition-shadow ${
                      selectedOverlayId === item.id
                        ? 'border-indigo-400 bg-indigo-500/10 shadow-lg ring-1 ring-indigo-400/50'
                        : 'border-dashed border-slate-400/50 hover:border-slate-300'
                    }`}
                  >
                    {item.type === 'signature' && (
                      <img src={item.content} alt="Signature" className="w-full h-full object-contain pointer-events-none" />
                    )}

                    {item.type === 'stamp' && (
                      item.content.startsWith('data:image') ? (
                        <img src={item.content} alt="Tampon" className="w-full h-full object-contain pointer-events-none" />
                      ) : (
                        <div className="w-full h-full border-2 border-red-500 text-red-500 rounded p-1 flex flex-col items-center justify-center text-center font-bold text-[9px] uppercase leading-tight bg-red-500/10 pointer-events-none">
                          <span>✓ CERTIFIÉ CONFORME</span>
                          <span className="text-[8px] font-normal">{new Date().toLocaleDateString('fr-FR')}</span>
                        </div>
                      )
                    )}

                    {item.type === 'name' && (
                      <div className="w-full h-full bg-slate-900/90 text-white rounded-lg px-2 py-1 flex items-center justify-between gap-1 shadow">
                        <div className="flex items-center gap-1.5 min-w-0 flex-1">
                          <User className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                          {editingNameId === item.id ? (
                            <input
                              type="text"
                              autoFocus
                              value={item.content}
                              onChange={(e) => {
                                const val = e.target.value;
                                setPageOverlays(prev => ({
                                  ...prev,
                                  [currentPageIndex]: (prev[currentPageIndex] || []).map(it => it.id === item.id ? { ...it, content: val } : it)
                                }));
                              }}
                              onBlur={() => setEditingNameId(null)}
                              onKeyDown={(e) => e.key === 'Enter' && setEditingNameId(null)}
                              className="bg-slate-950 text-white text-xs font-semibold px-1 py-0.5 rounded border border-blue-400 outline-none w-full"
                            />
                          ) : (
                            <span className="text-xs font-bold truncate text-slate-100">
                              {item.content || 'Nom du signataire'}
                            </span>
                          )}
                        </div>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setEditingNameId(editingNameId === item.id ? null : item.id);
                          }}
                          className="text-[11px] text-blue-400 hover:text-blue-300 px-1 py-0.5 rounded hover:bg-slate-800 transition cursor-pointer"
                          title="Modifier le nom"
                        >
                          ✎
                        </button>
                      </div>
                    )}

                    {item.type === 'date' && (
                      <div className="w-full h-full bg-slate-900/90 text-white rounded-lg px-2 py-1 flex items-center gap-1.5 shadow">
                        <Calendar className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                        <span className="text-xs font-bold text-slate-100 truncate">Date : {item.content}</span>
                      </div>
                    )}

                    {item.type === 'signature_placeholder' && (
                      <div 
                        onClick={(e) => {
                          e.stopPropagation();
                          setTargetPlaceholderId(item.id);
                          setIsSignatureModalOpen(true);
                        }}
                        onTouchEnd={(e) => {
                          e.stopPropagation();
                          setTargetPlaceholderId(item.id);
                          setIsSignatureModalOpen(true);
                        }}
                        className="w-full h-full border-2 border-dashed border-indigo-400 bg-indigo-950/40 hover:bg-indigo-950/70 rounded-xl p-2 flex flex-col items-center justify-center text-center cursor-pointer transition-all group touch-manipulation pointer-events-auto"
                        title="Touchez pour signer ou apposer un tampon ici"
                      >
                        <PenTool className="w-4 h-4 text-indigo-400 mb-1 group-hover:scale-110 transition-transform" />
                        <span className="text-[10px] font-extrabold text-indigo-200">Zone Signature / Cachet</span>
                        <span className="text-[9px] text-indigo-300/80">Touchez pour signer ici</span>
                      </div>
                    )}

                    {item.type === 'badge' && (
                      <div className="w-full h-full bg-blue-900 text-blue-100 rounded px-2 flex items-center justify-center text-xs font-bold pointer-events-none text-center leading-tight">
                        {item.content}
                      </div>
                    )}

                    {/* Bouton supprimer l'élément */}
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); removeOverlay(item.id); }}
                      className="absolute -top-2.5 -right-2.5 bg-red-600 text-white rounded-full p-1 opacity-80 hover:opacity-100 transition shadow cursor-pointer"
                      title="Supprimer"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </main>
      </div>

      {/* 3. BARRE D'OUTILS INFÉRIEURE : SIGNATURE, TAMPON, MENTIONS */}
      {pages.length > 0 && !isCameraActive && (
        <footer className="bg-slate-900 border-t border-slate-800 p-2.5 sm:p-3 flex flex-wrap sm:flex-nowrap items-center justify-between gap-2.5 shrink-0">
          <div className="flex items-center gap-1.5 sm:gap-2 overflow-x-auto max-w-[calc(100vw-130px)] sm:max-w-none scrollbar-none py-0.5 shrink-0">
            <button
              type="button"
              onClick={() => {
                setTargetPlaceholderId(null);
                setIsSignatureModalOpen(true);
              }}
              className="bg-indigo-600 hover:bg-indigo-500 px-3 sm:px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 text-white shadow-md shadow-indigo-600/30 cursor-pointer transition active:scale-95 shrink-0"
            >
              <PenTool className="w-4 h-4" /> <span>Signer / Tampon</span>
            </button>

            <button
              type="button"
              onClick={addStamp}
              className="bg-slate-800 hover:bg-slate-700 px-2.5 sm:px-3 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 text-slate-200 cursor-pointer shrink-0"
            >
              <ShieldCheck className="w-4 h-4 text-red-400" /> <span className="hidden xs:inline">Tampon Rapide</span>
            </button>

            <button
              type="button"
              onClick={() => addBadge("Lu et approuvé")}
              className="bg-slate-800 hover:bg-slate-700 px-2.5 sm:px-3 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 text-slate-200 cursor-pointer shrink-0"
            >
              <Check className="w-4 h-4 text-emerald-400" /> <span>"Lu et approuvé"</span>
            </button>

            <label className="bg-slate-800 hover:bg-slate-700 px-2.5 py-2 rounded-xl text-xs font-semibold flex items-center gap-1 text-slate-300 cursor-pointer shrink-0">
              <Plus className="w-3.5 h-3.5 text-blue-400" />
              <span>Page (PDF/Img)</span>
              <input type="file" accept="application/pdf,image/*" multiple onChange={handleFileUpload} className="hidden" />
            </label>
          </div>

          {/* Pagination */}
          <div className="flex items-center gap-2 text-xs font-bold text-slate-400 shrink-0">
            <button
              type="button"
              disabled={currentPageIndex === 0}
              onClick={() => setCurrentPageIndex(p => Math.max(0, p - 1))}
              className="p-1.5 bg-slate-800 rounded disabled:opacity-30 cursor-pointer hover:text-white"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
            </button>
            <span className="text-[11px] whitespace-nowrap">Page {currentPageIndex + 1} / {pages.length}</span>
            <button
              type="button"
              disabled={currentPageIndex >= pages.length - 1}
              onClick={() => setCurrentPageIndex(p => Math.min(pages.length - 1, p + 1))}
              className="p-1.5 bg-slate-800 rounded disabled:opacity-30 cursor-pointer hover:text-white"
            >
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </footer>
      )}

      {/* 4. MODALE DE SIGNATURE : OPTION A (Manuscrite) OU OPTION B (Tampon Commercial Pro) */}
      {isSignatureModalOpen && (
        <div className="fixed inset-0 z-[9999] bg-black/85 backdrop-blur-md flex items-center justify-center p-3 animate-in fade-in duration-150 pointer-events-auto">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 max-w-md w-full space-y-4 max-h-[95vh] overflow-y-auto shadow-2xl">
            {/* Modal Header with Tabs */}
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-2xl border border-slate-800">
                <button
                  type="button"
                  onClick={() => {
                    playTapBeep();
                    setSignatureModalMode('MANUSCRIT');
                  }}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                    signatureModalMode === 'MANUSCRIT'
                      ? 'bg-indigo-600 text-white shadow'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <PenTool className="w-3.5 h-3.5" />
                  <span>Signature Manuelle</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    playTapBeep();
                    setSignatureModalMode('TAMPON');
                  }}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                    signatureModalMode === 'TAMPON'
                      ? 'bg-red-600 text-white shadow'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>Tampon Commercial</span>
                </button>
              </div>

              <button
                type="button"
                onClick={() => {
                  playTapBeep();
                  setIsSignatureModalOpen(false);
                  setTargetPlaceholderId(null);
                }}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* TAB A : SIGNATURE MANUSCRITE */}
            {signatureModalMode === 'MANUSCRIT' && (
              <div className="space-y-3.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-slate-300 font-medium">
                    Tracez votre signature au doigt ou à la souris :
                  </span>

                  {/* Choix couleur d'encre */}
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-slate-400 font-medium">Encre :</span>
                    <div className="flex gap-1.5">
                      {[
                        { color: '#1e40af', label: 'Bleu encre' },
                        { color: '#0f172a', label: 'Noir' },
                        { color: '#dc2626', label: 'Rouge' },
                      ].map((c) => (
                        <button
                          key={c.color}
                          type="button"
                          onClick={() => setInkColor(c.color)}
                          style={{ backgroundColor: c.color }}
                          className={`w-5 h-5 rounded-full border-2 cursor-pointer transition ${
                            inkColor === c.color ? 'border-white scale-110 shadow' : 'border-slate-700'
                          }`}
                          title={c.label}
                        />
                      ))}
                    </div>
                  </div>
                </div>

                {/* Zone Canvas Touch */}
                <div className="bg-white rounded-2xl overflow-hidden border border-slate-700 touch-none shadow-inner">
                  <canvas
                    ref={sigCanvasRef}
                    width={360}
                    height={180}
                    onMouseDown={startSign}
                    onMouseMove={drawSign}
                    onMouseUp={endSign}
                    onTouchStart={startSign}
                    onTouchMove={drawSign}
                    onTouchEnd={endSign}
                    className="w-full h-44 cursor-crosshair block"
                  />
                </div>

                <div className="flex items-center justify-between gap-2 pt-1">
                  <button
                    type="button"
                    onClick={clearSignCanvas}
                    className="bg-slate-800 hover:bg-slate-700 text-slate-300 px-3 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 cursor-pointer transition"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Effacer</span>
                  </button>

                  <button
                    type="button"
                    onClick={saveDrawnSignature}
                    className="bg-indigo-600 hover:bg-indigo-500 px-4 py-2 rounded-xl text-xs font-bold text-white shadow-lg shadow-indigo-600/30 cursor-pointer transition active:scale-95"
                  >
                    Valider la signature
                  </button>
                </div>
              </div>
            )}

            {/* TAB B : TAMPON / CACHET COMMERCIAL PRO */}
            {signatureModalMode === 'TAMPON' && (
              <div className="space-y-3.5">
                {/* Aperçu en direct du tampon */}
                <div className="bg-slate-950 rounded-2xl p-3 border border-slate-800 flex flex-col items-center justify-center min-h-[140px]">
                  <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider mb-2">
                    Aperçu du Cachet en temps réel :
                  </span>
                  {stampPreviewUrl ? (
                    <img
                      src={stampPreviewUrl}
                      alt="Aperçu du Tampon"
                      className="max-h-28 object-contain"
                    />
                  ) : (
                    <div className="text-xs text-slate-500">Génération du tampon...</div>
                  )}
                </div>

                {/* Formulaire de configuration rapide */}
                <div className="space-y-2.5">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-300 mb-1">
                      Raison Sociale / Nom de la Boutique
                    </label>
                    <input
                      type="text"
                      value={stampCompanyName}
                      onChange={(e) => setStampCompanyName(e.target.value)}
                      placeholder="Ex: NaNa COMMERCE SARL"
                      className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-white outline-none focus:border-red-400"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-300 mb-1">
                      Mention Légale du Tampon
                    </label>
                    <input
                      type="text"
                      value={stampMention}
                      onChange={(e) => setStampMention(e.target.value)}
                      placeholder="Ex: LU ET APPROUVÉ"
                      className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-white outline-none focus:border-red-400 mb-1.5"
                    />
                    {/* Puces de mentions rapides */}
                    <div className="flex flex-wrap gap-1">
                      {[
                        'LU ET APPROUVÉ',
                        'BON POUR ACCORD',
                        'PAYÉ ET ENCAISSÉ',
                        'CERTIFIÉ CONFORME',
                        'REÇU CONFORME'
                      ].map((m) => (
                        <button
                          key={m}
                          type="button"
                          onClick={() => setStampMention(m)}
                          className={`text-[9.5px] px-2 py-0.5 rounded-lg border transition cursor-pointer ${
                            stampMention === m
                              ? 'bg-red-950 text-red-300 border-red-500/60 font-bold'
                              : 'bg-slate-800 text-slate-400 border-slate-700 hover:text-slate-200'
                          }`}
                        >
                          {m}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-300 mb-1">
                      Ville / Téléphone / Contact
                    </label>
                    <input
                      type="text"
                      value={stampContact}
                      onChange={(e) => setStampContact(e.target.value)}
                      placeholder="Ex: Abidjan • +225 07 12 34 56"
                      className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-white outline-none focus:border-red-400"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2 pt-1">
                    {/* Forme du Tampon */}
                    <div>
                      <label className="block text-[10.5px] font-bold text-slate-400 mb-1">
                        Forme :
                      </label>
                      <div className="grid grid-cols-2 gap-1">
                        <button
                          type="button"
                          onClick={() => setStampShape('RECTANGULAR')}
                          className={`py-1.5 px-2 rounded-xl text-[10px] font-bold border transition cursor-pointer ${
                            stampShape === 'RECTANGULAR'
                              ? 'bg-slate-800 text-white border-red-500/80 shadow'
                              : 'bg-slate-950 text-slate-400 border-slate-800'
                          }`}
                        >
                          Rectangulaire
                        </button>
                        <button
                          type="button"
                          onClick={() => setStampShape('CIRCULAR')}
                          className={`py-1.5 px-2 rounded-xl text-[10px] font-bold border transition cursor-pointer ${
                            stampShape === 'CIRCULAR'
                              ? 'bg-slate-800 text-white border-red-500/80 shadow'
                              : 'bg-slate-950 text-slate-400 border-slate-800'
                          }`}
                        >
                          Circulaire
                        </button>
                      </div>
                    </div>

                    {/* Couleur d'Encre du Tampon */}
                    <div>
                      <label className="block text-[10.5px] font-bold text-slate-400 mb-1">
                        Couleur d'encre :
                      </label>
                      <div className="flex items-center gap-2 pt-1">
                        {[
                          { color: '#dc2626', label: 'Rouge officiel' },
                          { color: '#1d4ed8', label: 'Bleu encre' },
                          { color: '#1e293b', label: 'Noir officiel' },
                        ].map((c) => (
                          <button
                            key={c.color}
                            type="button"
                            onClick={() => setStampColor(c.color)}
                            style={{ backgroundColor: c.color }}
                            className={`w-6 h-6 rounded-full border-2 cursor-pointer transition ${
                              stampColor === c.color ? 'border-white scale-110 shadow' : 'border-slate-700'
                            }`}
                            title={c.label}
                          />
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
                  <button
                    type="button"
                    onClick={() => {
                      setIsSignatureModalOpen(false);
                      setTargetPlaceholderId(null);
                    }}
                    className="px-3 py-2 text-xs font-semibold text-slate-400 cursor-pointer"
                  >
                    Annuler
                  </button>
                  <button
                    type="button"
                    onClick={saveCommercialStamp}
                    className="bg-red-600 hover:bg-red-500 px-4 py-2 rounded-xl text-xs font-bold text-white shadow-lg shadow-red-600/30 cursor-pointer transition active:scale-95 flex items-center gap-1.5"
                  >
                    <ShieldCheck className="w-3.5 h-3.5" />
                    <span>Apposer le Tampon</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 5. WIDGET FLOTTANT ASSISTANT IA JURIDIQUE & FINANCIER OHADA */}
      <LegalAiAdvisorWidget
        isOpen={isLegalAiOpen}
        onToggle={() => setIsLegalAiOpen((prev) => !prev)}
        onClose={() => setIsLegalAiOpen(false)}
        documentContext={initialDocTitle}
      />

    </div>
  );
}
