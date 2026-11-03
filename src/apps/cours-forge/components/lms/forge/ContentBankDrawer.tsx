import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  X, 
  UploadCloud, 
  FileText, 
  FileArchive, 
  FileCode, 
  FileSpreadsheet, 
  Trash2, 
  ExternalLink, 
  Paperclip, 
  Check, 
  Search, 
  Filter, 
  FolderLock, 
  HardDrive,
  Sparkles,
  AlertCircle
} from 'lucide-react';
import { LessonResource } from '../../../../../types';
import { uploadContentBankFile, getContentBankFiles, deleteContentBankFile } from '../../../../../services/lmsService';
import { playTapBeep, playValidationBeep } from '../../../../../utils/audio';

export interface ContentBankDrawerProps {
  isOpen: boolean;
  courseId: string;
  targetLessonTitle?: string;
  onClose: () => void;
  onLinkAsset?: (resource: LessonResource) => void;
}

export const ContentBankDrawer: React.FC<ContentBankDrawerProps> = ({
  isOpen,
  courseId = 'telecom-fintech-masterclass',
  targetLessonTitle,
  onClose,
  onLinkAsset
}) => {
  const [resources, setResources] = useState<LessonResource[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [typeFilter, setTypeFilter] = useState<'ALL' | 'PDF' | 'ZIP' | 'CODE' | 'SHEET'>('ALL');
  const [justLinkedId, setJustLinkedId] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Charger les ressources
  useEffect(() => {
    if (!isOpen) return;
    setIsLoading(true);
    getContentBankFiles(courseId)
      .then(files => {
        setResources(files);
        setIsLoading(false);
      })
      .catch(() => setIsLoading(false));
  }, [isOpen, courseId]);

  if (!isOpen) return null;

  // Téléversement d'un fichier
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    playTapBeep();
    setIsUploading(true);

    try {
      const newRes = await uploadContentBankFile(courseId, file);
      setResources(prev => [newRes, ...prev]);
      playValidationBeep();
    } catch (err) {
      console.error("Erreur téléversement Content Bank:", err);
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  // Suppression d'un fichier
  const handleDelete = async (resId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!window.confirm("Supprimer cette ressource de la banque de contenu ?")) return;
    playTapBeep();
    await deleteContentBankFile(courseId, resId);
    setResources(prev => prev.filter(r => r.id !== resId));
  };

  // Liaison à la leçon cible
  const handleLink = (res: LessonResource) => {
    playValidationBeep();
    setJustLinkedId(res.id);
    if (onLinkAsset) {
      onLinkAsset(res);
    }
    setTimeout(() => {
      setJustLinkedId(null);
    }, 1800);
  };

  // Filtrage
  const filteredResources = resources.filter(res => {
    if (typeFilter !== 'ALL' && res.fileType !== typeFilter) return false;
    if (searchQuery.trim()) {
      return res.title.toLowerCase().includes(searchQuery.toLowerCase());
    }
    return true;
  });

  const getIcon = (type: LessonResource['fileType']) => {
    switch (type) {
      case 'PDF': return <FileText className="w-4 h-4 text-rose-400" />;
      case 'ZIP': return <FileArchive className="w-4 h-4 text-amber-400" />;
      case 'CODE': return <FileCode className="w-4 h-4 text-cyan-400" />;
      case 'SHEET': return <FileSpreadsheet className="w-4 h-4 text-emerald-400" />;
      default: return <FileText className="w-4 h-4 text-indigo-400" />;
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden flex justify-end bg-black/70 backdrop-blur-sm animate-fadeIn select-none">
      <div 
        className="w-full max-w-lg bg-slate-900 border-l border-slate-800 h-full flex flex-col shadow-2xl animate-slideLeft"
        onClick={e => e.stopPropagation()}
      >
        {/* En-tête */}
        <div className="p-5 border-b border-slate-800 bg-slate-950/80 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 flex items-center justify-center shadow-inner">
              <HardDrive className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-black text-white">Banque de Contenu &amp; Médias</h3>
                <span className="px-2 py-0.5 rounded-full text-[9px] font-black bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                  Firebase Storage
                </span>
              </div>
              <p className="text-xs text-slate-400">
                {targetLessonTitle 
                  ? `Associer un support à : "${targetLessonTitle}"`
                  : "Dépôt centralisé des pièces jointes et guides"}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Dropzone d'upload */}
        <div className="p-5 border-b border-slate-800 bg-slate-950/40 space-y-3">
          <input
            ref={fileInputRef}
            type="file"
            onChange={handleFileChange}
            accept=".pdf,.zip,.rar,.tar,.gz,.xlsx,.xls,.csv,.js,.ts,.py,.json,.png,.jpg,.jpeg"
            className="hidden"
          />

          <div
            onClick={() => fileInputRef.current?.click()}
            className="p-4 rounded-2xl border-2 border-dashed border-slate-700 hover:border-indigo-500 bg-slate-900/60 hover:bg-slate-900 cursor-pointer transition text-center space-y-2 group"
          >
            <div className="w-10 h-10 rounded-xl bg-indigo-500/10 text-indigo-400 mx-auto flex items-center justify-center group-hover:scale-110 transition">
              {isUploading ? (
                <div className="w-5 h-5 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
              ) : (
                <UploadCloud className="w-5 h-5" />
              )}
            </div>
            <div>
              <span className="text-xs font-bold text-white group-hover:text-indigo-300 transition">
                {isUploading ? "Téléversement vers Firebase Storage..." : "Téléverser un nouveau document ou pack"}
              </span>
              <p className="text-[11px] text-slate-400 mt-0.5">
                PDF, ZIP, Excel, Code source jusqu&apos;à 100 Mo
              </p>
            </div>
          </div>

          {/* Barre de recherche et filtres */}
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Rechercher une pièce jointe..."
                className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-8 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div className="flex p-0.5 rounded-xl bg-slate-950 border border-slate-800 text-[10px]">
              {(['ALL', 'PDF', 'ZIP', 'CODE'] as const).map(type => (
                <button
                  key={type}
                  type="button"
                  onClick={() => setTypeFilter(type)}
                  className={`px-2 py-1 rounded-lg font-bold transition cursor-pointer ${
                    typeFilter === type ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  {type}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Liste des ressources */}
        <div className="flex-1 overflow-y-auto p-5 space-y-3">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-16 text-slate-400 space-y-2">
              <div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
              <span className="text-xs font-bold">Chargement des ressources...</span>
            </div>
          ) : filteredResources.length === 0 ? (
            <div className="text-center py-16 text-slate-500 space-y-2">
              <Paperclip className="w-8 h-8 mx-auto text-slate-600" />
              <p className="text-xs font-bold">Aucune ressource trouvée</p>
              <p className="text-[11px] text-slate-500">Téléversez un fichier ci-dessus pour l&apos;ajouter à la banque</p>
            </div>
          ) : (
            filteredResources.map((res) => {
              const isJustLinked = justLinkedId === res.id;
              return (
                <div
                  key={res.id}
                  className="p-3.5 rounded-2xl bg-slate-950/70 border border-slate-800 hover:border-slate-700 transition flex items-center justify-between gap-3 group"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-9 h-9 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-center shrink-0">
                      {getIcon(res.fileType)}
                    </div>
                    <div className="min-w-0">
                      <h5 className="text-xs font-bold text-white truncate group-hover:text-indigo-300 transition">
                        {res.title}
                      </h5>
                      <div className="flex items-center gap-2 text-[10.5px] text-slate-400 mt-0.5">
                        <span className="font-mono">{res.fileSize}</span>
                        <span>•</span>
                        <span className="uppercase font-bold text-indigo-400">{res.fileType}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    {/* Bouton Link Asset */}
                    {onLinkAsset && (
                      <button
                        type="button"
                        onClick={() => handleLink(res)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-black transition flex items-center gap-1 cursor-pointer ${
                          isJustLinked 
                            ? 'bg-emerald-500 text-white'
                            : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-md shadow-indigo-600/30'
                        }`}
                        title="Associer ce fichier à la leçon"
                      >
                        {isJustLinked ? (
                          <>
                            <Check className="w-3.5 h-3.5" />
                            <span>Lié !</span>
                          </>
                        ) : (
                          <>
                            <Paperclip className="w-3.5 h-3.5" />
                            <span>Lier</span>
                          </>
                        )}
                      </button>
                    )}

                    {/* Télécharger / Ouvrir */}
                    <a
                      href={res.downloadUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
                      title="Télécharger / Ouvrir"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>

                    {/* Supprimer */}
                    <button
                      type="button"
                      onClick={(e) => handleDelete(res.id, e)}
                      className="p-2 rounded-xl text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 transition cursor-pointer"
                      title="Supprimer définitivement"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Pied de page */}
        <div className="p-4 border-t border-slate-800 bg-slate-950 flex items-center justify-between text-xs text-slate-400">
          <span>{resources.length} ressource(s) dans la banque</span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold transition cursor-pointer"
          >
            Fermer
          </button>
        </div>
      </div>
    </div>
  );
};

export default ContentBankDrawer;
