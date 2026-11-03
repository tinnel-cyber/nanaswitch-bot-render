import React, { useState, useRef, useCallback } from 'react';
import { compressImageToBase64 } from '../../utils/imageCompressor';
import { Camera, Upload, X, Check, User, RefreshCw } from 'lucide-react';
import { playTapBeep, playValidationBeep } from '../../utils/audio';

interface ProfilePhotoUploadProps {
  currentPhotoUrl?: string;
  name: string;
  targetId: string;
  category: 'seller' | 'manager' | 'customer';
  onPhotoUpdated: (url: string) => void;
  size?: 'sm' | 'md' | 'lg';
  editable?: boolean;
}

export const ProfilePhotoUpload: React.FC<ProfilePhotoUploadProps> = ({
  currentPhotoUrl,
  name,
  targetId,
  category,
  onPhotoUpdated,
  size = 'md',
  editable = true,
}) => {
  const [photoUrl, setPhotoUrl] = useState<string | undefined>(currentPhotoUrl);
  const [isUploading, setIsUploading] = useState(false);
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Compute initials
  const initials = name
    .trim()
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((n) => n[0].toUpperCase())
    .join('') || 'U';

  const sizeClasses = {
    sm: 'w-8 h-8 text-xs',
    md: 'w-12 h-12 text-sm',
    lg: 'w-20 h-20 text-lg',
  }[size];

  // Colors based on category
  const bgGradients = {
    seller: 'from-blue-600 to-indigo-700',
    manager: 'from-amber-500 to-orange-600',
    customer: 'from-emerald-600 to-teal-700',
  }[category];

  // 1. Gestion fichier sélectionné
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    playTapBeep();
    setIsUploading(true);
    try {
      const maxD = category === 'seller' || category === 'manager' ? 200 : 400;
      const base64 = await compressImageToBase64(file, maxD, maxD, 0.7);
      setPhotoUrl(base64);
      onPhotoUpdated(base64);
      playValidationBeep();
    } catch (error) {
      console.error('Image compression error:', error);
      alert('Erreur lors du redimensionnement de l\'image.');
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleCapturePhoto = () => {
    if (!videoRef.current) return;
    playTapBeep();

    const canvas = document.createElement('canvas');
    canvas.width = 250;
    canvas.height = 250;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.drawImage(videoRef.current, 0, 0, 250, 250);
      const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
      setPhotoUrl(dataUrl);
      onPhotoUpdated(dataUrl);
      playValidationBeep();
    }

    handleStopCamera();
  };

  
  const handleStartCamera = async () => {
    setIsCameraOpen(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' } });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (err) {
      console.error('Camera access error:', err);
      alert('Erreur d\'accès à la caméra.');
      setIsCameraOpen(false);
    }
  };

  const handleStopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    setIsCameraOpen(false);
  };

  return (
    <div className="relative inline-flex flex-col items-center">
      {/* Avatar Container */}
      <div
        className={`relative ${sizeClasses} rounded-2xl overflow-hidden border border-slate-700 shadow-md flex items-center justify-center font-bold text-white shrink-0 group select-none`}
      >
        {photoUrl ? (
          <img
            src={photoUrl}
            alt={name}
            className="w-full h-full object-cover"
            referrerPolicy="no-referrer"
          />
        ) : (
          <div className={`w-full h-full bg-gradient-to-tr ${bgGradients} flex items-center justify-center`}>
            <span>{initials}</span>
          </div>
        )}

        {/* Upload Spinner Overlay */}
        {isUploading && (
          <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
            <RefreshCw className="w-4 h-4 text-white animate-spin" />
          </div>
        )}

        {/* Hover / Edit Overlay Button */}
        {editable && !isUploading && (
          <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1 cursor-pointer">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="p-1 rounded-md bg-slate-800 hover:bg-slate-700 text-white"
              title="Charger une photo"
            >
              <Upload className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={handleStartCamera}
              className="p-1 rounded-md bg-slate-800 hover:bg-slate-700 text-amber-300"
              title="Prendre une photo avec la caméra"
            >
              <Camera className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </div>

      {/* Hidden File Input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileChange}
        className="hidden"
      />

      {/* Modal Caméra Directe */}
      {isCameraOpen && (
        <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/80 p-4 backdrop-blur-xs">
          <div className="w-full max-w-xs bg-slate-900 border border-slate-700 rounded-2xl p-4 shadow-2xl space-y-3 text-slate-100">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <h4 className="text-xs font-bold text-white flex items-center gap-1.5">
                <Camera className="w-3.5 h-3.5 text-amber-400" />
                Prendre la photo
              </h4>
              <button
                type="button"
                onClick={handleStopCamera}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="w-full h-56 bg-black rounded-xl overflow-hidden relative">
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover"
              />
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={handleCapturePhoto}
                className="flex-1 py-2 bg-emerald-600 hover:bg-emerald-500 font-bold text-xs rounded-xl text-white shadow-md flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Check className="w-3.5 h-3.5" />
                <span>Capturer</span>
              </button>
              <button
                type="button"
                onClick={handleStopCamera}
                className="py-2 px-3 bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-xs rounded-xl"
              >
                Annuler
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProfilePhotoUpload;
