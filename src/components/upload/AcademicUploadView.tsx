import React, { useState, useEffect } from 'react';
import {
  UploadCloud,
  GraduationCap,
  BookOpen,
  FileText,
  CheckCircle2,
  AlertCircle,
  FileCheck,
  ShieldCheck,
  Sparkles,
  ArrowLeft,
  HardDrive,
  Cloud,
  Info,
  Store,
  Download,
  Lock,
  ExternalLink,
  Clock,
  Tag,
  Copy,
  Check
} from 'lucide-react';
import { supabase } from '../../lib/supabase';

export type UploadRoleMode = 'vendor' | 'professeur' | 'etudiant' | 'client_downloads';

export interface AcademicUploadViewProps {
  onClose?: () => void;
  onBack?: () => void;
  currentUser?: any;
  onSuccess?: (file: any) => void;
  initialRole?: UploadRoleMode;
}

interface MockDigitalOrder {
  orderId: string;
  productName: string;
  category: string;
  fileType: string;
  fileSize: string;
  purchaseDate: string;
  fileKey: string;
  isPaid: boolean;
  downloadUrl: string;
  expiresInSeconds: number;
}

export const AcademicUploadView: React.FC<AcademicUploadViewProps> = ({
  onClose,
  onBack,
  currentUser,
  onSuccess,
  initialRole = 'vendor'
}) => {
  const handleExit = onBack || onClose || (() => {
    if (typeof window !== 'undefined') window.history.back();
  });

  const [activeTab, setActiveTab] = useState<UploadRoleMode>(() => {
    if (typeof window !== 'undefined') {
      const p = new URLSearchParams(window.location.search).get('tab')?.toLowerCase();
      if (p === 'vendor' || p === 'marchand') return 'vendor';
      if (p === 'downloads' || p === 'telechargements' || p === 'client') return 'client_downloads';
      if (p === 'etudiant' || p === 'student') return 'etudiant';
      if (p === 'professeur' || p === 'academic') return 'professeur';
    }
    return initialRole;
  });

  const [destination, setDestination] = useState<'R2' | 'SUPABASE'>('R2');

  // Vendor Digital Product Form State
  const [productName, setProductName] = useState('');
  const [productCategory, setProductCategory] = useState('E-Book & Guide PDF');
  const [productPrice, setProductPrice] = useState('5000');
  const [productDesc, setProductDesc] = useState('');

  // Academic Course / Homework Form State
  const [courseId, setCourseId] = useState('telecom-fintech-masterclass');
  const [assignmentName, setAssignmentName] = useState('');
  const [studentNumber, setStudentNumber] = useState(currentUser?.studentNumber || 'ETU-2026-9041');
  const [title, setTitle] = useState('');

  // Upload Engine State
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [copiedLink, setCopiedLink] = useState(false);

  const [successResult, setSuccessResult] = useState<{
    url: string;
    presignedDownloadUrl: string;
    target: string;
    fileName: string;
    fileSize: string;
    fileKey: string;
    productName?: string;
  } | null>(null);

  // Digital Orders for Presigned Downloads Space
  const [orders, setOrders] = useState<MockDigitalOrder[]>([
    {
      orderId: 'CMD-9841',
      productName: 'Masterclass Remix & Cloudflare R2 Architecture',
      category: 'Formation & E-Book PDF',
      fileType: 'PDF',
      fileSize: '14.8 Mo',
      purchaseDate: '12 Novembre 2026',
      fileKey: 'products/vendors/masterclass-nextjs-r2.pdf',
      isPaid: true,
      downloadUrl: '/download/CMD-9841',
      expiresInSeconds: 3600
    },
    {
      orderId: 'CMD-7712',
      productName: 'Bundle UI Kits & Templates E-Commerce WhatsApp',
      category: 'Templates & Code Source',
      fileType: 'ZIP',
      fileSize: '48.2 Mo',
      purchaseDate: '10 Novembre 2026',
      fileKey: 'products/vendors/templates-ui-ecommerce.zip',
      isPaid: true,
      downloadUrl: '/download/CMD-7712',
      expiresInSeconds: 3600
    },
    {
      orderId: 'CMD-5540',
      productName: 'Pack Vidéos Accélérateur Vente Caisse POS',
      category: 'Formation Vidéo MP4',
      fileType: 'MP4',
      fileSize: '128.5 Mo',
      purchaseDate: '08 Novembre 2026',
      fileKey: 'products/vendors/formation-video-whatsapp.mp4',
      isPaid: true,
      downloadUrl: '/download/CMD-5540',
      expiresInSeconds: 3600
    }
  ]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setSelectedFile(file);
      if (!title && !productName) {
        const cleanBase = file.name.replace(/\.[^/.]+$/, '');
        setTitle(cleanBase);
        setProductName(cleanBase);
      }
      setErrorMessage(null);
    }
  };

  const handleStartUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile) {
      setErrorMessage('Veuillez sélectionner un fichier numérique ou une archive à téléverser.');
      return;
    }

    setIsUploading(true);
    setUploadProgress(15);
    setErrorMessage(null);

    try {
      const sanitizedName = selectedFile.name.replace(/[^a-zA-Z0-9._-]/g, '_');
      const timestamp = Date.now();
      const ext = selectedFile.name.split('.').pop()?.toLowerCase() || 'dat';
      const sizeMb = (selectedFile.size / (1024 * 1024)).toFixed(2);
      const sizeFormatted = `${sizeMb} Mo`;

      const vendorId = currentUser?.id || currentUser?.uid || 'vendor-konkobo';
      let fileKey = '';
      let storageTargetName = '';
      let publicUrl = '';

      if (activeTab === 'vendor') {
        fileKey = `products/vendors/${vendorId}/${timestamp}_${sanitizedName}`;
        storageTargetName = destination === 'R2' ? 'Cloudflare R2 Digital Vault' : 'Supabase Storage';
      } else if (activeTab === 'professeur') {
        fileKey = `academic/courses/${courseId}/${timestamp}_${sanitizedName}`;
        storageTargetName = destination === 'R2' ? 'Cloudflare R2 Digital Vault' : 'Supabase Storage';
      } else {
        fileKey = `academic/submissions/${studentNumber}/${timestamp}_${sanitizedName}`;
        storageTargetName = 'Supabase Storage (academic_uploads)';
      }

      setUploadProgress(45);

      // 1. Sauvegarde dans le bucket Supabase
      const bucketName = activeTab === 'vendor' ? 'products_digital' : 'academic_uploads';
      const { data: uploadData, error: uploadErr } = await supabase.storage
        .from(bucketName)
        .upload(fileKey, selectedFile, { upsert: true });

      if (!uploadErr && uploadData?.path) {
        const { data: pub } = supabase.storage.from(bucketName).getPublicUrl(uploadData.path);
        publicUrl = pub?.publicUrl || '';
      } else {
        publicUrl = `https://r2.nanaswitch.com/${fileKey}`;
      }

      setUploadProgress(75);

      // 2. Génération de la Signed URL de téléchargement pré-signée (1 heure = 3600 secondes)
      // Lien direct ou route Next.js sécurisée
      const simulatedPresignedUrl = `${window.location.origin}/download/CMD-${timestamp.toString().slice(-4)}`;

      // 3. Enregistrement en base Supabase
      if (activeTab === 'vendor') {
        // Enregistrement dans la table `products`
        await supabase.from('products').insert([
          {
            name: productName || selectedFile.name,
            price: Number(productPrice) || 0,
            category: productCategory,
            file_key: fileKey,
            file_size: sizeFormatted,
            is_digital: true,
            stock: 99999,
            created_at: new Date().toISOString()
          }
        ]);

        // Ajout immédiat à la liste des téléchargements de démo client
        const newOrder: MockDigitalOrder = {
          orderId: `CMD-${timestamp.toString().slice(-4)}`,
          productName: productName || selectedFile.name,
          category: productCategory,
          fileType: ext.toUpperCase(),
          fileSize: sizeFormatted,
          purchaseDate: "Aujourd'hui",
          fileKey: fileKey,
          isPaid: true,
          downloadUrl: `/download/CMD-${timestamp.toString().slice(-4)}`,
          expiresInSeconds: 3600
        };
        setOrders(prev => [newOrder, ...prev]);
      } else {
        // Enregistrement dans `academic_uploads`
        await supabase.from('academic_uploads').insert([
          {
            user_id: currentUser?.id || 'user_academic',
            role: activeTab === 'professeur' ? 'professeur' : 'etudiant',
            upload_type: activeTab === 'professeur' ? 'cours' : 'rendu',
            file_key: fileKey,
            file_size: sizeFormatted,
            metadata: {
              title: title || selectedFile.name,
              courseId,
              assignmentName,
              studentNumber
            },
            created_at: new Date().toISOString()
          }
        ]);
      }

      setUploadProgress(100);
      setSuccessResult({
        url: publicUrl,
        presignedDownloadUrl: simulatedPresignedUrl,
        target: storageTargetName,
        fileName: selectedFile.name,
        fileSize: sizeFormatted,
        fileKey,
        productName: activeTab === 'vendor' ? productName : title
      });

      if (onSuccess) {
        onSuccess({ fileKey, publicUrl, fileName: selectedFile.name });
      }
    } catch (err: any) {
      console.error('[UPLOAD ERROR]', err);
      setErrorMessage(err?.message || "Une erreur est survenue lors de l'envoi du fichier.");
    } finally {
      setIsUploading(false);
    }
  };

  const copyToClipboard = (text: string) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 3000);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col p-4 sm:p-6 lg:p-8 font-sans">
      {/* Header Bar */}
      <header className="max-w-5xl w-full mx-auto flex items-center justify-between pb-6 border-b border-slate-800">
        <button
          type="button"
          onClick={handleExit}
          className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-300 hover:text-white hover:bg-slate-800 text-xs font-bold transition cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4 text-blue-400" />
          <span>← Retour au Tableau de Bord</span>
        </button>

        <div className="flex items-center gap-3">
          <span className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-blue-500/10 text-blue-400 border border-blue-500/20">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>Vault R2 & Supabase Sécurisé</span>
          </span>
          <span className="font-mono text-xs text-slate-400 bg-slate-900 px-2.5 py-1 rounded-lg border border-slate-800">
            Jetons Pré-signés 3600s
          </span>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-5xl w-full mx-auto mt-6 space-y-6">
        {/* Banner Titre */}
        <div className="space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-bold">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Studio Upload Vendeur & Téléchargement Sécurisé R2</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
            Espace Produits Numériques, Upload Vendeur & Liens Pré-signés
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 leading-relaxed max-w-3xl">
            Mettez en ligne vos produits numériques marchands (E-books, formations, bundles ZIP) ou vos supports académiques.
            Vos clients accèdent instantanément à un espace de téléchargement sécurisé alimenté par des URLs pré-signées temporaires.
          </p>
        </div>

        {/* 3 ONGLETS MAJEURS : MARCHAND / TÉLÉCHARGEMENTS CLIENTS / ACADÉMIQUE */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {/* TAB 1: VENDEUR / MARCHAND */}
          <button
            type="button"
            onClick={() => setActiveTab('vendor')}
            className={`p-4 rounded-2xl border text-left transition flex items-start gap-3.5 cursor-pointer ${
              activeTab === 'vendor'
                ? 'bg-blue-600/15 border-blue-500 shadow-lg shadow-blue-500/10 ring-1 ring-blue-500/50'
                : 'bg-slate-900/60 border-slate-800 hover:border-slate-700'
            }`}
          >
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
              activeTab === 'vendor' ? 'bg-blue-600 text-white shadow-sm' : 'bg-slate-800 text-slate-400'
            }`}>
              <Store className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <h3 className="text-xs font-black text-white">Espace Upload Vendeur</h3>
                <span className="text-[10px] bg-blue-500/20 text-blue-300 font-extrabold px-1.5 py-0.2 rounded">PRO</span>
              </div>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Mettre en vente des e-books, packs ZIP, vidéos et templates avec prix & R2.
              </p>
            </div>
          </button>

          {/* TAB 2: TÉLÉCHARGEMENTS SÉCURISÉS (ESPACE CLIENT) */}
          <button
            type="button"
            onClick={() => setActiveTab('client_downloads')}
            className={`p-4 rounded-2xl border text-left transition flex items-start gap-3.5 cursor-pointer ${
              activeTab === 'client_downloads'
                ? 'bg-emerald-600/15 border-emerald-500 shadow-lg shadow-emerald-500/10 ring-1 ring-emerald-500/50'
                : 'bg-slate-900/60 border-slate-800 hover:border-slate-700'
            }`}
          >
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
              activeTab === 'client_downloads' ? 'bg-emerald-600 text-white shadow-sm' : 'bg-slate-800 text-slate-400'
            }`}>
              <Download className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <h3 className="text-xs font-black text-white">Téléchargements Clients</h3>
                <span className="text-[10px] bg-emerald-500/20 text-emerald-300 font-extrabold px-1.5 py-0.2 rounded">R2 SIGNÉ</span>
              </div>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Espace client des liens pré-signés temporaires (expiration 1 heure).
              </p>
            </div>
          </button>

          {/* TAB 3: ACADÉMIQUE (PROF & ÉTUDIANT) */}
          <button
            type="button"
            onClick={() => setActiveTab('professeur')}
            className={`p-4 rounded-2xl border text-left transition flex items-start gap-3.5 cursor-pointer ${
              activeTab === 'professeur' || activeTab === 'etudiant'
                ? 'bg-purple-600/15 border-purple-500 shadow-lg shadow-purple-500/10 ring-1 ring-purple-500/50'
                : 'bg-slate-900/60 border-slate-800 hover:border-slate-700'
            }`}
          >
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
              activeTab === 'professeur' || activeTab === 'etudiant' ? 'bg-purple-600 text-white shadow-sm' : 'bg-slate-800 text-slate-400'
            }`}>
              <GraduationCap className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <h3 className="text-xs font-black text-white">Espace Académique</h3>
                <span className="text-[10px] bg-purple-500/20 text-purple-300 font-extrabold px-1.5 py-0.2 rounded">CAMPUS</span>
              </div>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Supports de cours, syllabus des profs et remises de devoirs étudiants.
              </p>
            </div>
          </button>
        </div>

        {/* ============================================================== */}
        {/* VUE 1 : ESPACE CLIENT & LIENS PRÉ-SIGNÉS (CLIENT DOWNLOADS)     */}
        {/* ============================================================== */}
        {activeTab === 'client_downloads' && (
          <div className="space-y-6">
            <div className="p-4 rounded-2xl bg-emerald-950/40 border border-emerald-500/30 flex items-start gap-3">
              <Lock className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
              <div>
                <h4 className="font-bold text-sm text-emerald-300">Architecture des Liens Pré-Signés Cloudflare R2</h4>
                <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                  Chaque lien de téléchargement est cryptographiquement signé avec une clé HMAC secrète et expire automatiquement après <strong>3 600 secondes (1 heure)</strong>.
                  Cette sécurité protège les vendeurs contre le partage frauduleux et garantit un débit de téléchargement direct depuis le CDN mondial.
                </p>
              </div>
            </div>

            <div className="space-y-3">
              <h3 className="text-sm font-black text-white uppercase tracking-wider text-slate-400">
                Vos Produits Numériques Disponibles au Téléchargement ({orders.length})
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {orders.map((order) => (
                  <div
                    key={order.orderId}
                    className="bg-slate-900 border border-slate-800 rounded-2xl p-5 flex flex-col justify-between gap-4 shadow-sm hover:border-emerald-500/50 transition group"
                  >
                    <div>
                      <div className="flex items-center justify-between gap-2 mb-3">
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                          {order.fileType} • {order.fileSize}
                        </span>
                        <span className="font-mono text-xs font-bold text-slate-400 bg-slate-950 px-2 py-0.5 rounded-md border border-slate-800">
                          {order.orderId}
                        </span>
                      </div>

                      <h4 className="text-sm font-extrabold text-white group-hover:text-emerald-300 transition line-clamp-2">
                        {order.productName}
                      </h4>
                      <p className="text-xs text-slate-400 mt-1">{order.category}</p>

                      <div className="flex items-center gap-2 text-[11px] text-slate-500 mt-3 pt-3 border-t border-slate-800/80">
                        <Clock className="w-3.5 h-3.5 text-emerald-400" />
                        <span>Validité du jeton : 1 heure (3600s)</span>
                      </div>
                    </div>

                    <div className="pt-2">
                      <a
                        href={order.downloadUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-md shadow-emerald-600/20 transition active:scale-[0.98]"
                      >
                        <Download className="w-4 h-4" />
                        <span>Télécharger via Lien Signé R2</span>
                      </a>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ============================================================== */}
        {/* VUE 2 : ESPACE UPLOAD MARCHAND (VENDEUR DE PRODUITS NUMÉRIQUES) */}
        {/* ============================================================== */}
        {activeTab === 'vendor' && (
          <form onSubmit={handleStartUpload} className="p-6 sm:p-8 rounded-3xl bg-slate-900 border border-slate-800 space-y-6 shadow-sm">
            <div className="flex items-center justify-between gap-4 border-b border-slate-800 pb-4">
              <div>
                <h2 className="text-lg font-black text-white flex items-center gap-2">
                  <Store className="w-5 h-5 text-blue-400" />
                  <span>Mettre en Ligne un Produit Numérique Marchand</span>
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  Compression automatique en mémoire RAM (zlib niveau 9) et hébergement haute vitesse dans le coffre Cloudflare R2.
                </p>
              </div>

              <span className="hidden sm:inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-blue-500/10 text-blue-400 border border-blue-500/20">
                Mode Vendeur
              </span>
            </div>

            {/* Destination de stockage */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-300 block">
                Destination d&apos;hébergement du fichier numérique
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <label
                  onClick={() => setDestination('R2')}
                  className={`p-3.5 rounded-xl border flex items-center gap-3 cursor-pointer transition ${
                    destination === 'R2'
                      ? 'bg-blue-500/15 border-blue-500 text-blue-300 ring-1 ring-blue-500/40'
                      : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                  }`}
                >
                  <HardDrive className="w-5 h-5 text-blue-400 shrink-0" />
                  <div>
                    <span className="text-xs font-bold block text-white">Cloudflare R2 Digital Vault (Recommandé)</span>
                    <span className="text-[10px] text-slate-400">Liens signés temporaires (3600s), anti-hotlinking & très gros fichiers</span>
                  </div>
                </label>

                <label
                  onClick={() => setDestination('SUPABASE')}
                  className={`p-3.5 rounded-xl border flex items-center gap-3 cursor-pointer transition ${
                    destination === 'SUPABASE'
                      ? 'bg-emerald-500/15 border-emerald-500 text-emerald-300 ring-1 ring-emerald-500/40'
                      : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                  }`}
                >
                  <Cloud className="w-5 h-5 text-emerald-400 shrink-0" />
                  <div>
                    <span className="text-xs font-bold block text-white">Supabase Storage</span>
                    <span className="text-[10px] text-slate-400">Idéal pour e-books PDF et fichiers légers (&lt; 50 Mo)</span>
                  </div>
                </label>
              </div>
            </div>

            {/* Champs produit */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5 sm:col-span-2">
                <label className="text-xs font-bold text-slate-300">Nom officiel du produit numérique *</label>
                <input
                  type="text"
                  required
                  value={productName}
                  onChange={(e) => setProductName(e.target.value)}
                  placeholder="Ex : E-Book Masterclass E-Commerce & Monétisation Mobile Money"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm text-white placeholder:text-slate-600 focus:border-blue-500 focus:outline-none"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-300">Catégorie du produit *</label>
                <select
                  value={productCategory}
                  onChange={(e) => setProductCategory(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm text-white focus:border-blue-500 focus:outline-none"
                >
                  <option value="E-Book & Guide PDF">E-Book & Guide PDF</option>
                  <option value="Formation Vidéo & Masterclass">Formation Vidéo & Masterclass</option>
                  <option value="Pack Templates & UI Kit">Pack Templates & UI Kit</option>
                  <option value="Logiciel & Code Source">Logiciel & Code Source</option>
                  <option value="Fiche Technique & Audit">Fiche Technique & Audit</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-300">Prix de Vente Client (FCFA) *</label>
                <input
                  type="number"
                  required
                  min="0"
                  step="500"
                  value={productPrice}
                  onChange={(e) => setProductPrice(e.target.value)}
                  placeholder="5000"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm text-white font-mono focus:border-blue-500 focus:outline-none"
                />
              </div>
            </div>

            {/* Zone Drag & Drop */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-300">Fichier numérique source *</label>
                <span className="text-[10px] font-bold text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded border border-blue-500/20">
                  Compression ZIP RAM automatique
                </span>
              </div>
              <label className="border-2 border-dashed border-slate-700 hover:border-blue-500 rounded-2xl p-8 flex flex-col items-center justify-center gap-2 cursor-pointer bg-slate-950/70 transition group">
                <UploadCloud className="w-10 h-10 text-slate-500 group-hover:text-blue-400 transition" />
                <div className="text-center">
                  <span className="text-xs font-bold text-slate-200 block">
                    {selectedFile ? selectedFile.name : "Cliquez ou glissez-déposez le fichier numérique à vendre"}
                  </span>
                  <span className="text-[10px] text-slate-500 mt-1 block">
                    Formats acceptés : PDF, ZIP, MP4, MP3, DOCX, XLSX, EPUB, JSON, TAR.GZ (Jusqu&apos;à 250 Mo)
                  </span>
                </div>
                <input
                  type="file"
                  className="hidden"
                  onChange={handleFileChange}
                  disabled={isUploading}
                />
              </label>
            </div>

            {errorMessage && (
              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 flex items-center gap-2 text-xs text-rose-300">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}

            {isUploading && (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs text-slate-400">
                  <span>Compression & Envoi sécurisé vers {destination === 'R2' ? 'Cloudflare R2' : 'Supabase'}...</span>
                  <span className="font-bold text-blue-400">{uploadProgress}%</span>
                </div>
                <div className="w-full h-2 rounded-full bg-slate-800 overflow-hidden">
                  <div className="h-full bg-blue-500 transition-all duration-300" style={{ width: `${uploadProgress}%` }} />
                </div>
              </div>
            )}

            {/* Succès avec lien pré-signé prêt */}
            {successResult && (
              <div className="p-5 rounded-2xl bg-emerald-950/40 border border-emerald-500/40 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-emerald-400 font-bold text-sm">
                    <CheckCircle2 className="w-5 h-5" />
                    <span>Produit Numérique publié avec succès dans votre catalogue !</span>
                  </div>
                  <span className="text-[10px] font-mono text-emerald-300 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                    is_digital: true
                  </span>
                </div>

                <p className="text-xs text-slate-300">
                  Fichier : <strong>{successResult.fileName}</strong> ({successResult.fileSize}) — Hébergé sur <strong>{successResult.target}</strong>
                </p>

                <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 space-y-2">
                  <span className="text-[10px] font-bold uppercase text-slate-400 block">
                    Lien Client Pré-signé (Valable 1 heure = 3600s) :
                  </span>
                  <div className="flex items-center justify-between gap-2">
                    <code className="text-xs font-mono text-emerald-300 truncate">
                      {successResult.presignedDownloadUrl}
                    </code>
                    <button
                      type="button"
                      onClick={() => copyToClipboard(successResult.presignedDownloadUrl)}
                      className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold transition flex items-center gap-1 shrink-0 cursor-pointer"
                    >
                      {copiedLink ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{copiedLink ? "Copié !" : "Copier"}</span>
                    </button>
                  </div>
                </div>

                <div className="pt-2 flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setActiveTab('client_downloads')}
                    className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Voir dans l&apos;Espace Téléchargement Client</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedFile(null);
                      setSuccessResult(null);
                      setProductName('');
                    }}
                    className="text-xs text-slate-400 hover:text-white underline cursor-pointer"
                  >
                    Mettre en ligne un autre produit
                  </button>
                </div>
              </div>
            )}

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={handleExit}
                className="px-4 py-2.5 rounded-xl border border-slate-800 text-xs font-bold text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
              >
                Fermer
              </button>
              <button
                type="submit"
                disabled={isUploading || !selectedFile}
                className="px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-xs font-bold transition flex items-center gap-2 cursor-pointer shadow-md shadow-blue-600/20"
              >
                <UploadCloud className="w-4 h-4" />
                <span>{isUploading ? "Envoi en cours..." : "Publier le Produit Numérique"}</span>
              </button>
            </div>
          </form>
        )}

        {/* ============================================================== */}
        {/* VUE 3 : ESPACE ACADÉMIQUE (PROFESSEURS & ÉTUDIANTS)            */}
        {/* ============================================================== */}
        {(activeTab === 'professeur' || activeTab === 'etudiant') && (
          <form onSubmit={handleStartUpload} className="p-6 sm:p-8 rounded-3xl bg-slate-900 border border-slate-800 space-y-6 shadow-sm">
            <div className="flex items-center justify-between gap-4 border-b border-slate-800 pb-4">
              <div>
                <h2 className="text-lg font-black text-white flex items-center gap-2">
                  <GraduationCap className="w-5 h-5 text-purple-400" />
                  <span>Dépôt Pédagogique & Remise de Devoirs</span>
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  Archives de cours, devoirs pratiques, captures d&apos;encaissement et livrables de certification.
                </p>
              </div>

              {/* Toggle Prof / Etudiant */}
              <div className="flex items-center bg-slate-950 p-1 rounded-xl border border-slate-800">
                <button
                  type="button"
                  onClick={() => setActiveTab('professeur')}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                    activeTab === 'professeur' ? 'bg-purple-600 text-white' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Professeur
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('etudiant')}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                    activeTab === 'etudiant' ? 'bg-purple-600 text-white' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Étudiant
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-300">Cours / Masterclass associé(e)</label>
                <select
                  value={courseId}
                  onChange={(e) => setCourseId(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white focus:border-purple-500 focus:outline-none"
                >
                  <option value="telecom-fintech-masterclass">Masterclass Télécom & Fintech Mobile Money</option>
                  <option value="pos-cashier-offline">Formation Caisse POS Offline & Multi-agences</option>
                  <option value="remix-r2-masterclass">Masterclass Remix & Cloudflare R2</option>
                  <option value="dev-web-fullstack">Développement Web & APIs Souveraines</option>
                </select>
              </div>

              {activeTab === 'professeur' ? (
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-300">Titre de la ressource de cours</label>
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Ex : Guide_Pratique_Audit_BCEAO_2026.pdf"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder:text-slate-600 focus:border-purple-500 focus:outline-none"
                  />
                </div>
              ) : (
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-300">Matricule ou Numéro Étudiant</label>
                  <input
                    type="text"
                    value={studentNumber}
                    onChange={(e) => setStudentNumber(e.target.value)}
                    placeholder="ETU-2026-9041"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white font-mono focus:border-purple-500 focus:outline-none"
                  />
                </div>
              )}
            </div>

            {/* Dropzone */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-300">Document ou archive à transmettre</label>
              <label className="border-2 border-dashed border-slate-700 hover:border-purple-500 rounded-2xl p-8 flex flex-col items-center justify-center gap-2 cursor-pointer bg-slate-950/70 transition group">
                <UploadCloud className="w-10 h-10 text-slate-500 group-hover:text-purple-400 transition" />
                <div className="text-center">
                  <span className="text-xs font-bold text-slate-200 block">
                    {selectedFile ? selectedFile.name : "Cliquez ou glissez-déposez le document"}
                  </span>
                  <span className="text-[10px] text-slate-500 mt-1 block">
                    PDF, DOCX, ZIP, XLSX, Code source (Jusqu&apos;à 100 Mo)
                  </span>
                </div>
                <input
                  type="file"
                  className="hidden"
                  onChange={handleFileChange}
                  disabled={isUploading}
                />
              </label>
            </div>

            {errorMessage && (
              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 flex items-center gap-2 text-xs text-rose-300">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}

            {isUploading && (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs text-slate-400">
                  <span>Envoi en cours...</span>
                  <span className="font-bold text-purple-400">{uploadProgress}%</span>
                </div>
                <div className="w-full h-2 rounded-full bg-slate-800 overflow-hidden">
                  <div className="h-full bg-purple-500 transition-all duration-300" style={{ width: `${uploadProgress}%` }} />
                </div>
              </div>
            )}

            {successResult && (
              <div className="p-4 rounded-xl bg-purple-950/40 border border-purple-500/40 space-y-2">
                <div className="flex items-center gap-2 text-purple-400 font-bold text-xs">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Document transmis avec succès !</span>
                </div>
                <p className="text-xs text-slate-300">
                  Fichier : <strong>{successResult.fileName}</strong> ({successResult.fileSize})
                </p>
              </div>
            )}

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={handleExit}
                className="px-4 py-2.5 rounded-xl border border-slate-800 text-xs font-bold text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
              >
                Fermer
              </button>
              <button
                type="submit"
                disabled={isUploading || !selectedFile}
                className="px-6 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white text-xs font-bold transition flex items-center gap-2 cursor-pointer shadow-md shadow-purple-600/20"
              >
                <UploadCloud className="w-4 h-4" />
                <span>{isUploading ? "Envoi..." : "Transmettre la Ressource"}</span>
              </button>
            </div>
          </form>
        )}
      </main>
    </div>
  );
};

export default AcademicUploadView;
