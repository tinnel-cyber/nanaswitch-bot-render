import React, { useState, useRef } from 'react';
import { 
  Upload, 
  Image as ImageIcon, 
  Loader2, 
  CheckCircle2, 
  AlertCircle, 
  X,
  Sparkles
} from 'lucide-react';
import { uploadImageToImgbb } from '../../services/imgbbService';

export interface ImageUploadInputProps {
  value: string;
  onChange: (url: string) => void;
  label?: string;
  placeholder?: string;
  className?: string;
  showPreview?: boolean;
  previewHeight?: string;
  badge?: string;
  helperText?: string;
}

export const ImageUploadInput: React.FC<ImageUploadInputProps> = ({
  value,
  onChange,
  label = "URL de l'Image",
  placeholder = "https://i.ibb.co/... ou https://...",
  className = "",
  showPreview = true,
  previewHeight = "h-24",
  badge,
  helperText
}) => {
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [imgLoadError, setImgLoadError] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Réinitialise l'erreur de chargement à chaque nouvelle URL
  React.useEffect(() => {
    setImgLoadError(false);
  }, [value]);

  const cleanUrl = (raw: string): string => {
    if (!raw) return '';
    let cleaned = raw.trim().replace(/^["']|["']$/g, '');
    const match = cleaned.match(/\((https?:\/\/[^\)]+)\)/);
    if (match) cleaned = match[1];
    return cleaned;
  };

  // Déclencheur du sélecteur de fichiers
  const handleBrowseClick = () => {
    setUploadError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
      fileInputRef.current.click();
    }
  };

  // Traitement du téléversement d'un fichier
  const handleProcessFile = async (file: File) => {
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setUploadError("Le fichier sélectionné n'est pas une image valide (PNG, JPG, WebP acceptés).");
      return;
    }

    // Limite 32 Mo (limite ImgBB)
    if (file.size > 32 * 1024 * 1024) {
      setUploadError("L'image dépasse la limite maximale autorisée de 32 Mo.");
      return;
    }

    setIsUploading(true);
    setUploadError(null);
    setUploadSuccess(false);

    try {
      const result = await uploadImageToImgbb(file);
      if (result && result.url) {
        onChange(result.url);
        setUploadSuccess(true);
        setTimeout(() => setUploadSuccess(false), 3500);
      }
    } catch (err: any) {
      const msg = err?.message || "Échec du téléversement de l'image.";
      setUploadError(msg);
    } finally {
      setIsUploading(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleProcessFile(file);
    }
  };

  // Gestion du glisser-déposer (Drag & Drop)
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      handleProcessFile(file);
    }
  };

  return (
    <div className={`space-y-2 ${className}`}>
      {/* En-tête avec label et badge */}
      <div className="flex items-center justify-between">
        <label className="block font-bold text-slate-300 text-xs">
          {label}
        </label>
        {badge && (
          <span className="text-[10px] text-cyan-400 font-semibold bg-cyan-500/10 px-1.5 py-0.5 rounded border border-cyan-500/20">
            {badge}
          </span>
        )}
      </div>

      {/* Input caché pour le sélecteur natif */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileChange}
        className="hidden"
      />

      {/* Zone de saisie + Bouton d'upload direct avec Drag & Drop */}
      <div 
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`relative flex items-center gap-1.5 rounded-xl border transition-all ${
          isDragging 
            ? 'border-cyan-400 bg-cyan-500/10 ring-2 ring-cyan-500/30' 
            : 'border-slate-700 bg-slate-900/90 hover:border-slate-600'
        }`}
      >
        <div className="relative flex-1 min-w-0">
          <input
            type="text"
            value={value || ''}
            onChange={(e) => onChange(cleanUrl(e.target.value))}
            placeholder={isDragging ? "Déposez votre image ici..." : placeholder}
            disabled={isUploading}
            className="w-full bg-transparent px-3 py-2 text-white text-xs font-mono focus:outline-none placeholder-slate-500"
          />
          {value && (
            <button
              type="button"
              onClick={() => onChange('')}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white p-0.5 cursor-pointer"
              title="Effacer le lien"
            >
              <X className="w-3 h-3" />
            </button>
          )}
        </div>

        {/* Bouton d'upload direct */}
        <button
          type="button"
          onClick={handleBrowseClick}
          disabled={isUploading}
          className={`shrink-0 mr-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-sm ${
            isUploading
              ? 'bg-cyan-600/40 text-cyan-200 cursor-not-allowed'
              : 'bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white shadow-cyan-600/20 active:scale-95'
          }`}
          title="Sélectionner ou téléverser une image depuis votre appareil"
        >
          {isUploading ? (
            <>
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              <span>Envoi...</span>
            </>
          ) : (
            <>
              <Upload className="w-3.5 h-3.5" />
              <span>Parcourir</span>
            </>
          )}
        </button>
      </div>

      {/* Messages de statut et feedback */}
      {uploadSuccess && (
        <div className="flex items-center gap-1.5 text-[11px] text-emerald-400 font-bold bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1 rounded-lg animate-in fade-in">
          <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
          <span>Image téléversée avec succès !</span>
        </div>
      )}

      {uploadError && (
        <div className="flex items-start gap-1.5 text-[11px] text-rose-400 bg-rose-500/10 border border-rose-500/20 p-2 rounded-lg animate-in fade-in">
          <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
          <div className="flex-1">
            <span>{uploadError}</span>
          </div>
        </div>
      )}

      {/* Aperçu direct de l'image */}
      {showPreview && value && !uploadError && (
        <div className="space-y-1 pt-1">
          <div className="flex items-center justify-between text-[10px] text-slate-400 font-bold">
            <span className="flex items-center gap-1">
              <ImageIcon className="w-3 h-3 text-cyan-400" />
              <span>Aperçu de l'image liée :</span>
            </span>
            <span className="text-emerald-400">Actif ✓</span>
          </div>
          <div className={`relative w-full ${previewHeight} rounded-xl overflow-hidden border border-slate-800 bg-slate-950 flex items-center justify-center group shadow-inner`}>
            {!imgLoadError ? (
              <img 
                key={value}
                src={value} 
                alt="Aperçu" 
                className="w-full h-full object-cover transition duration-300 group-hover:scale-105"
                onError={() => {
                  setImgLoadError(true);
                }}
              />
            ) : (
              <div className="flex flex-col items-center justify-center text-slate-500 text-[10px] p-2 text-center gap-1">
                <AlertCircle className="w-4 h-4 text-amber-400" />
                <span>Format ou lien inaccessible</span>
              </div>
            )}
            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition flex items-center justify-center gap-2">
              <a
                href={value}
                target="_blank"
                rel="noopener noreferrer"
                className="px-2.5 py-1 rounded-lg bg-black/70 text-white text-[10px] font-bold hover:bg-black/90 transition backdrop-blur-xs"
              >
                Ouvrir ↗
              </a>
              <button
                type="button"
                onClick={handleBrowseClick}
                className="px-2.5 py-1 rounded-lg bg-cyan-600/90 text-white text-[10px] font-bold hover:bg-cyan-500 transition backdrop-blur-xs cursor-pointer"
              >
                Remplacer 📁
              </button>
            </div>
          </div>
        </div>
      )}

      {helperText && (
        <p className="text-[10px] text-slate-400 leading-relaxed">
          {helperText}
        </p>
      )}
    </div>
  );
};

export default ImageUploadInput;
